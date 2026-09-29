import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { COURTS, CASE_TYPES } from "../domain/catalog.ts";
import { ROLE_PERMISSIONS, ROLE_LABELS } from "../domain/rbac.ts";
import { DEMO_RULE } from "../domain/rule-parameters.ts";
import { SERVICE_CATALOG } from "../domain/service-fees.ts";
import { verifyPassword, signSession } from "./auth.ts";
import { appendAudit, verifyAuditChain } from "./audit.ts";
import { db } from "./db.ts";
import { seedIfEmpty } from "./seed.ts";
import { attachUser, COOKIE_NAME, cookieOptions, requirePermission, requireUser } from "./http-auth.ts";
import {
  createCase,
  createCaseSchema,
  createRuleChange,
  createServiceEstimate,
  dashboardStats,
  decideReview,
  getCase,
  getEstimate,
  listAudit,
  listCases,
  listEstimates,
  listRuleChanges,
  listUsers,
  patchCase,
  patchCaseSchema,
  reviewQueue,
  runCalculation,
  submitReview,
  transitionRule,
} from "./app-services.ts";

seedIfEmpty();

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

app.get("/api/health", async () => ({ ok: true, mode: process.env.APP_MODE ?? "demo" }));

app.get("/api/catalog", async () => ({
  courts: COURTS,
  caseTypes: CASE_TYPES,
  services: SERVICE_CATALOG,
  demoRule: DEMO_RULE,
  roles: ROLE_LABELS,
  permissions: ROLE_PERMISSIONS,
}));

app.post("/api/auth/login", async (request, reply) => {
  const body = z
    .object({
      username: z.string().min(1),
      password: z.string().min(1),
      courtId: z.string().optional(),
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
  if (!user || !verifyPassword(body.password, user.password_hash, user.password_salt)) {
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
    courtId: body.courtId ?? user.court_id,
    roles: roles as never,
  };
  const token = await signSession(session);
  reply.setCookie(COOKIE_NAME, token, cookieOptions);
  appendAudit({ actorId: user.id, action: "auth.login", entity: "user", entityId: user.id, payload: { courtId: session.courtId } });
  return { user: session, mode: "demo" };
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
  if (!requirePermission(request, reply, "dashboard:view")) return;
  return dashboardStats();
});

app.get("/api/cases", async (request, reply) => {
  if (!requirePermission(request, reply, "case:view")) return;
  return { items: listCases() };
});

app.post("/api/cases", async (request, reply) => {
  const user = requirePermission(request, reply, "case:create");
  if (!user) return;
  const body = createCaseSchema.parse(request.body);
  return reply.code(201).send(createCase(body, user));
});

app.get("/api/cases/:id", async (request, reply) => {
  if (!requirePermission(request, reply, "case:view")) return;
  const item = getCase((request.params as { id: string }).id);
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
  if (!requirePermission(request, reply, "calculation:view")) return;
  const caseId = (request.query as { caseId?: string }).caseId;
  return { items: listEstimates(caseId) };
});

app.get("/api/calculations/:id", async (request, reply) => {
  if (!requirePermission(request, reply, "calculation:view")) return;
  const item = getEstimate((request.params as { id: string }).id);
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
  if (!requirePermission(request, reply, "calculation:view")) return;
  return { items: reviewQueue() };
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
  const { hasPermission } = await import("../domain/rbac.ts");
  if (!hasPermission(user.roles, "users:manage") && !hasPermission(user.roles, "security:manage")) {
    return reply.code(403).send({ error: "FORBIDDEN", message: "لا صلاحية لهذا الإجراء." });
  }
  return { items: listUsers() };
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
