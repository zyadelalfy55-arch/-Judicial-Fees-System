import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { COURTS, CASE_TYPES } from "../domain/catalog.ts";
import { calculateFees } from "../domain/calculate.ts";
import { hasPermission, ROLE_PERMISSIONS, ROLE_LABELS } from "../domain/rbac.ts";
import { DEMO_RULE } from "../domain/rule-parameters.ts";
import { SERVICE_CATALOG } from "../domain/service-fees.ts";
import type { CalculationInput } from "../domain/types.ts";
import { verifyPassword, signSession } from "./auth.ts";
import { appendAudit, verifyAuditChain } from "./audit.ts";
import { db } from "./db.ts";
import { bootstrapSuperAdmin, isDemoUserId, seedIfEmpty } from "./seed.ts";
import { attachUser, COOKIE_NAME, cookieOptions, requirePermission, requireUser } from "./http-auth.ts";
import {
  createCase,
  createCaseSchema,
  createManagedUser,
  createManagedUserSchema,
  createRuleChange,
  createServiceEstimate,
  type AdminDashboardFilters,
  adminDashboardStats,
  dashboardStats,
  decideReview,
  getCase,
  getEstimate,
  getUserProfile,
  listAudit,
  listCases,
  listEstimates,
  listRuleChanges,
  searchUsers,
  listCitizenServiceEstimates,
  patchCase,
  patchCaseSchema,
  reviewQueue,
  runCalculation,
  submitReview,
  transitionRule,
  registerCitizen,
  updateCitizenProfile,
  updateManagedUser,
  updateManagedUserSchema,
} from "./app-services.ts";

seedIfEmpty();
bootstrapSuperAdmin();

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });

await app.register(helmet, { contentSecurityPolicy: false });
await app.register(cookie);
await app.register(cors, {
  origin: (process.env.CORS_ORIGINS ?? "http://localhost:5173").split(","),
  credentials: true,
});
await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });

app.addHook("onRequest", async (request) => {
  await attachUser(request);
});

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof z.ZodError) {
    return reply.code(400).send({ error: "VALIDATION_ERROR", message: "تحقق من البيانات المدخلة." });
  }
  app.log.error(error);
  return reply.code(500).send({ error: "INTERNAL_ERROR", message: "حدث خطأ داخلي." });
});

app.get("/api/health", () => ({ ok: true, mode: process.env.APP_MODE ?? "demo" }));

app.get("/api/catalog", () => ({
  courts: COURTS,
  caseTypes: CASE_TYPES,
  services: SERVICE_CATALOG,
  demoRule: DEMO_RULE,
  roles: ROLE_LABELS,
  permissions: ROLE_PERMISSIONS,
}));

app.post("/api/public/calculate", { config: { rateLimit: { max: 12, timeWindow: "1 minute" } } }, async (request, reply) => {
  const body = z.object({
    courtId: z.string().min(1),
    caseTypeId: z.string().min(1),
    stage: z.enum(["filing", "final"]),
    valueKind: z.enum(["known", "unknown", "estimate"]),
    claimStructure: z.enum(["single", "same-basis", "different-bases", "rent-termination", "unsure"]),
    claimAmount: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    awardedAmount: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
    prepaid: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
    urgent: z.boolean().default(false),
    feeRelief: z.enum(["standard", "reduced", "exempt", "review"]),
  }).strict().parse(request.body);
  if (!COURTS.some((court) => court.id === body.courtId) || !CASE_TYPES.some((type) => type.id === body.caseTypeId)) {
    return reply.code(400).send({ error: "INVALID_CALCULATION", message: "راجع المحكمة ونوع الدعوى." });
  }
  const courtLevel = COURTS.find((court) => court.id === body.courtId)!.level;
  const input: CalculationInput = {
    ...body,
    courtLevel,
    claims: [],
    accruals: [],
    caseFacts: {},
  };
  try {
    const result = calculateFees(input);
    return {
      amount: result.netPayable,
      total: result.total,
      feeLines: result.feeLines,
      computationTrail: result.computationTrail,
      sources: result.sources,
      warnings: result.warnings,
      assumptions: result.assumptions,
      requiresReview: result.requiresReview,
      ruleSetId: result.ruleSetId,
      ruleSetVersion: result.ruleSetVersion,
    };
  } catch {
    return reply.code(400).send({ error: "INVALID_CALCULATION", message: "تعذر حساب هذه البيانات. راجع نوع الدعوى وهيكل الطلبات." });
  }
});

app.post("/api/auth/login", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request, reply) => {
  const body = z
    .object({
      username: z.string().min(1),
      password: z.string().min(1),
    })
    .parse(request.body);
  const user = db.prepare("SELECT * FROM users WHERE username=? AND active=1").get(body.username) as
    | {
        id: string;
        username: string;
        display_name: string;
        title_ar: string;
        court_id: string | null;
        password_hash: string;
        password_salt: string;
      }
    | undefined;
  const production = process.env.NODE_ENV === "production" || process.env.APP_MODE === "production";
  if (!user || (production && isDemoUserId(user.id)) || !verifyPassword(body.password, user.password_hash, user.password_salt)) {
    appendAudit({ action: "auth.failed", entity: "user", payload: { username: body.username } });
    return reply.code(401).send({ error: "INVALID_CREDENTIALS", message: "بيانات الدخول غير صحيحة." });
  }
  const roles = (
    db.prepare("SELECT role_id FROM user_roles WHERE user_id=?").all(user.id) as Array<{ role_id: string }>
  ).map((r) => r.role_id);
  const session = {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    titleAr: user.title_ar,
    courtId: roles.includes("citizen") ? null : user.court_id,
    roles: roles as never,
  };
  const token = await signSession(session);
  reply.setCookie(COOKIE_NAME, token, cookieOptions);
  appendAudit({ actorId: user.id, action: "auth.login", entity: "user", entityId: user.id, payload: { courtId: session.courtId } });
  return { user: session, mode: process.env.APP_MODE ?? "demo" };
});

app.post("/api/auth/register", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (request, reply) => {
  const body = z.object({
    username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/),
    displayName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(6).max(30).optional(),
    password: z.string().min(12).max(200),
  }).parse(request.body);
  try {
    const created = registerCitizen(body);
    const profile = created as { id: string; username: string; displayName: string; titleAr: string; courtId: string | null };
    const user = { ...profile, roles: ["citizen"] as never[] };
    const token = await signSession(user as never);
    reply.setCookie(COOKIE_NAME, token, cookieOptions);
    return reply.code(201).send({ user, mode: process.env.APP_MODE ?? "demo" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "REGISTRATION_FAILED";
    if (["USERNAME_EXISTS", "EMAIL_EXISTS", "PHONE_EXISTS"].includes(message)) {
      return reply.code(409).send({ error: message, message: "اسم المستخدم أو البريد أو الهاتف مستخدم بالفعل." });
    }
    throw error;
  }
});

app.post("/api/auth/logout", async (request, reply) => {
  if (request.user) {
    appendAudit({ actorId: request.user.id, action: "auth.logout", entity: "user", entityId: request.user.id, payload: {} });
  }
  reply.clearCookie(COOKIE_NAME, { path: "/" });
  return { ok: true };
});

app.get("/api/auth/me", async (request, reply) => {
  const user = requireUser(request, reply);
  if (!user) return;
  return { user, mode: process.env.APP_MODE ?? "demo" };
});

app.get("/api/dashboard", async (request, reply) => {
  const user = requirePermission(request, reply, "dashboard:view");
  if (!user) return;
  return dashboardStats(user);
});

app.get("/api/admin/dashboard", async (request, reply) => {
  const user = requirePermission(request, reply, "dashboard:admin");
  if (!user) return;
  const filters = z.object({
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional(),
    status: z.enum(["DRAFT", "SUBMITTED", "CALCULATING", "CALCULATED", "PENDING_REVIEW", "RETURNED", "APPROVED", "ISSUED"]).optional(),
    serviceId: z.string().optional(),
    roleId: z.enum(["citizen", "admin", "super_admin", "estimator", "supervisor", "legal_reviewer", "project_manager", "leader", "system_admin"]).optional(),
  }).refine((input) => !input.dateFrom || !input.dateTo || input.dateFrom <= input.dateTo, {
    message: "INVALID_DATE_RANGE",
    path: ["dateTo"],
  }).parse(request.query) as AdminDashboardFilters;
  if (filters.serviceId && !SERVICE_CATALOG.some((service) => service.id === filters.serviceId)) {
    return reply.code(400).send({ error: "INVALID_SERVICE_FILTER", message: "الخدمة المحددة غير معروفة." });
  }
  return adminDashboardStats(hasPermission(user.roles, "security:manage"), filters);
});

app.get("/api/citizen/dashboard", async (request, reply) => {
  const user = requirePermission(request, reply, "citizen:portal");
  if (!user) return;
  return { estimates: listCitizenServiceEstimates(user.id) };
});

app.get("/api/citizen/profile", async (request, reply) => {
  const user = requirePermission(request, reply, "citizen:profile");
  if (!user) return;
  return getUserProfile(user.id);
});

app.patch("/api/citizen/profile", async (request, reply) => {
  const user = requirePermission(request, reply, "citizen:profile");
  if (!user) return;
  const body = z.object({
    displayName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(6).max(30).optional(),
  }).parse(request.body);
  try {
    return updateCitizenProfile(user.id, body);
  } catch (error) {
    if (error instanceof Error && ["EMAIL_EXISTS", "PHONE_EXISTS"].includes(error.message)) {
      return reply.code(409).send({ error: error.message, message: "البريد أو الهاتف مستخدم بالفعل." });
    }
    throw error;
  }
});

app.get("/api/cases", async (request, reply) => {
  const user = requirePermission(request, reply, "case:view");
  if (!user) return;
  return { items: listCases(user) };
});

app.post("/api/cases", async (request, reply) => {
  const user = requirePermission(request, reply, "case:create");
  if (!user) return;
  const body = createCaseSchema.parse(request.body);
  try {
    return reply.code(201).send(createCase(body, user));
  } catch (error) {
    if (error instanceof Error && error.message === "COURT_ACCESS_FORBIDDEN") {
      return reply.code(403).send({ error: "FORBIDDEN", message: "لا يمكنك إنشاء قضية خارج المحكمة المسندة لحسابك." });
    }
    throw error;
  }
});

app.get("/api/cases/:id", async (request, reply) => {
  const user = requirePermission(request, reply, "case:view");
  if (!user) return;
  const item = getCase((request.params as { id: string }).id, user);
  if (!item) return reply.code(404).send({ error: "NOT_FOUND" });
  return item;
});

app.patch("/api/cases/:id", async (request, reply) => {
  const user = requirePermission(request, reply, "case:edit");
  if (!user) return;
  try {
    const item = patchCase((request.params as { id: string }).id, patchCaseSchema.parse(request.body), user);
    if (!item) return reply.code(404).send({ error: "NOT_FOUND" });
    return item;
  } catch (err) {
    return reply.code(409).send({ error: (err as Error).message });
  }
});

app.post("/api/cases/:id/calculate", async (request, reply) => {
  const user = requirePermission(request, reply, "calculation:create");
  if (!user) return;
  try {
    return runCalculation((request.params as { id: string }).id, user);
  } catch (err) {
    return reply.code(409).send({ error: (err as Error).message });
  }
});

app.get("/api/calculations", async (request, reply) => {
  const user = requirePermission(request, reply, "calculation:view");
  if (!user) return;
  const caseId = (request.query as { caseId?: string }).caseId;
  return { items: listEstimates(caseId, user) };
});

app.get("/api/calculations/:id", async (request, reply) => {
  const user = requirePermission(request, reply, "calculation:view");
  if (!user) return;
  const item = getEstimate((request.params as { id: string }).id, user);
  if (!item) return reply.code(404).send({ error: "NOT_FOUND" });
  return item;
});

app.post("/api/calculations/:id/submit-review", async (request, reply) => {
  const user = requirePermission(request, reply, "calculation:submit-review");
  if (!user) return;
  try {
    return submitReview((request.params as { id: string }).id, user);
  } catch (err) {
    return reply.code(409).send({ error: (err as Error).message });
  }
});

app.post("/api/calculations/:id/approve", async (request, reply) => {
  const user = requirePermission(request, reply, "calculation:approve");
  if (!user) return;
  const body = z.object({ reason: z.string().optional() }).parse(request.body ?? {});
  try {
    return decideReview((request.params as { id: string }).id, "approve", body.reason, user);
  } catch (err) {
    return reply.code(409).send({ error: (err as Error).message });
  }
});

app.post("/api/calculations/:id/return", async (request, reply) => {
  const user = requirePermission(request, reply, "calculation:return");
  if (!user) return;
  const body = z.object({ reason: z.string().min(1) }).parse(request.body);
  try {
    return decideReview((request.params as { id: string }).id, "return", body.reason, user);
  } catch (err) {
    return reply.code(409).send({ error: (err as Error).message });
  }
});

app.get("/api/review-queue", async (request, reply) => {
  const user = requirePermission(request, reply, "calculation:view");
  if (!user) return;
  return { items: reviewQueue(user) };
});

app.get("/api/rules", async (request, reply) => {
  if (!requirePermission(request, reply, "rule:view")) return;
  return { published: DEMO_RULE, changes: listRuleChanges() };
});

app.post("/api/rules", async (request, reply) => {
  const user = requirePermission(request, reply, "rule:create");
  if (!user) return;
  return reply.code(201).send(createRuleChange(request.body ?? {}, user));
});

app.post("/api/rule-change-requests/:id/:action", async (request, reply) => {
  const params = z
    .object({ id: z.string().min(1), action: z.enum(["submit", "approve", "reject", "publish"]) })
    .parse(request.params);
  let perm: "rule:publish" | "rule:review" | "rule:edit";
  switch (params.action) {
    case "publish":
      perm = "rule:publish";
      break;
    case "approve":
    case "reject":
      perm = "rule:review";
      break;
    default:
      perm = "rule:edit";
  }
  const user = requirePermission(request, reply, perm);
  if (!user) return;
  try {
    return transitionRule(params.id, params.action, user);
  } catch (err) {
    return reply.code(409).send({ error: (err as Error).message });
  }
});

app.get("/api/audit", async (request, reply) => {
  const user = requirePermission(request, reply, "audit:view");
  if (!user) return;
  const q = (request.query as { q?: string }).q;
  const { hasPermission } = await import("../domain/rbac.ts");
  return { items: listAudit(q), chain: hasPermission(user.roles, "audit:verify") ? verifyAuditChain() : undefined };
});

app.post("/api/audit/verify", async (request, reply) => {
  if (!requirePermission(request, reply, "audit:verify")) return;
  return verifyAuditChain();
});

app.get("/api/users", async (request, reply) => {
  const user = requireUser(request, reply);
  if (!user) return;
  if (!hasPermission(user.roles, "users:manage")) {
    return reply.code(403).send({ error: "FORBIDDEN", message: "لا صلاحية لهذا الإجراء." });
  }
  const query = z.object({
    q: z.string().trim().max(100).optional(),
    roleId: z.enum(["citizen", "admin", "super_admin", "estimator", "supervisor", "legal_reviewer", "project_manager", "leader", "system_admin"]).optional(),
    active: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }).parse(request.query);
  return {
    ...searchUsers({ ...query, limit: query.pageSize, offset: (query.page - 1) * query.pageSize }),
    page: query.page,
    pageSize: query.pageSize,
  };
});

app.post("/api/users", async (request, reply) => {
  const user = requirePermission(request, reply, "users:manage");
  if (!user) return;
  const body = createManagedUserSchema.parse(request.body);
  try {
    return reply.code(201).send(createManagedUser(body, user));
  } catch (error) {
    const message = error instanceof Error ? error.message : "USER_CREATE_FAILED";
    if (message === "ROLE_ESCALATION_FORBIDDEN") return reply.code(403).send({ error: message });
    if (["USERNAME_EXISTS", "EMAIL_EXISTS", "PHONE_EXISTS"].includes(message)) return reply.code(409).send({ error: message });
    throw error;
  }
});

app.patch("/api/users/:id", async (request, reply) => {
  const user = requirePermission(request, reply, "users:manage");
  if (!user) return;
  const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
  const body = updateManagedUserSchema.parse(request.body);
  try {
    const updated = updateManagedUser(id, body, user);
    if (!updated) return reply.code(404).send({ error: "NOT_FOUND" });
    return updated;
  } catch (error) {
    const message = error instanceof Error ? error.message : "USER_UPDATE_FAILED";
    if (message === "ROLE_ESCALATION_FORBIDDEN" || message === "SELF_DEACTIVATION_FORBIDDEN") return reply.code(403).send({ error: message });
    if (message === "COURT_REQUIRED") return reply.code(400).send({ error: message, message: "لا يمكن إسناد دور موظف دون اختيار محكمة." });
    if (message === "LAST_SUPER_ADMIN_REQUIRED") return reply.code(409).send({ error: message, message: "لا يمكن تعطيل أو خفض آخر حساب سوبر أدمن نشط." });
    throw error;
  }
});

app.get("/api/services", async (request, reply) => {
  if (!requirePermission(request, reply, "services:calculate")) return;
  return { items: SERVICE_CATALOG, unverified: true };
});

app.post("/api/services/calculate", async (request, reply) => {
  const user = requirePermission(request, reply, "services:calculate");
  if (!user) return;
  const body = z.object({ serviceId: z.string(), pages: z.number().int().min(1).default(1) }).parse(request.body);
  return createServiceEstimate(body.serviceId as never, body.pages, user);
});

const port = Number(process.env.PORT ?? 8787);
await app.listen({ port, host: "127.0.0.1" });
