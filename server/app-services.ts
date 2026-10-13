import crypto from "node:crypto";
import { z } from "zod";
import { calculateFees } from "../domain/calculate.ts";
import { COURTS } from "../domain/catalog.ts";
import { calculateServiceFee, SERVICE_CATALOG, type CourtServiceId } from "../domain/service-fees.ts";
import { assertCanReviewRule, canPublish, nextRuleStatus } from "../domain/governance.ts";
import { canAccessCase, canAccessCourt, hasPermission, ROLE_LABELS } from "../domain/rbac.ts";
import { assertCanDecideReview, assertCanSubmitReview } from "../domain/review-policy.ts";
import { assertTransition } from "../domain/state-machine.ts";
import type { CalculationInput, CaseStatus, ClaimItem, FeeTreatment, RoleId } from "../domain/types.ts";
import { appendAudit } from "./audit.ts";
import { db, nowIso } from "./db.ts";
import { hashPassword, type SessionUser } from "./auth.ts";

const claimSchema = z.object({
  id: z.string(),
  label: z.string(),
  requestKind: z.enum(["primary", "additional", "alternative"]),
  valueKind: z.enum(["known", "unknown", "estimate"]),
  disposition: z.enum(["claimed", "awarded", "dismissed", "settled", "other"]),
  aggregation: z.enum(["sum", "max", "independent"]).optional(),
  groupKey: z.string().optional(),
  claimedAmount: z.number().int().nonnegative(),
  awardedAmount: z.number().int().nonnegative().optional(),
});

export const createCaseSchema = z.object({
  caseNumber: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  courtId: z.string(),
  caseTypeId: z.string(),
  courtLevel: z.enum(["first-instance", "appeal", "cassation"]),
  plaintiff: z.string().min(1),
  defendant: z.string().min(1),
  representative: z.string().optional(),
});

export const patchCaseSchema = z.object({
  facts: z
    .object({
      obligationDate: z.string().optional(),
      multipleDefendants: z.boolean().optional(),
      independentInterests: z.boolean().optional(),
      geographicNotes: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  claims: z.array(claimSchema).optional(),
  accruals: z
    .array(
      z.object({
        kind: z.enum(["rent", "yield", "daily-compensation", "interest"]),
        amount: z.number().int().nonnegative(),
        filingBasis: z.boolean().optional(),
        accruedToJudgment: z.boolean().optional(),
      }),
    )
    .optional(),
  claimStructure: z.enum(["single", "same-basis", "different-bases", "rent-termination", "unsure"]).optional(),
  valueKind: z.enum(["known", "unknown", "estimate"]).optional(),
  stage: z.enum(["filing", "final"]).optional(),
  claimAmount: z.number().int().nonnegative().optional(),
  awardedAmount: z.number().int().nonnegative().optional(),
  prepaid: z.number().int().nonnegative().optional(),
  urgent: z.boolean().optional(),
  feeRelief: z.enum(["standard", "reduced", "exempt", "review"]).optional(),
  plaintiff: z.string().optional(),
  defendant: z.string().optional(),
  representative: z.string().optional(),
});

function caseRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    caseNumber: row.case_number,
    year: row.year,
    courtId: row.court_id,
    caseTypeId: row.case_type_id,
    courtLevel: row.court_level,
    status: row.status,
    plaintiff: row.plaintiff,
    defendant: row.defendant,
    representative: row.representative,
    facts: JSON.parse(String(row.facts_json)),
    claims: JSON.parse(String(row.claims_json)),
    accruals: JSON.parse(String(row.accruals_json)),
    claimStructure: row.claim_structure,
    valueKind: row.value_kind,
    stage: row.stage,
    claimAmount: row.claim_amount,
    awardedAmount: row.awarded_amount,
    prepaid: row.prepaid,
    urgent: Boolean(row.urgent),
    feeRelief: row.fee_relief,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listCases(user?: SessionUser) {
  const globalAccess = !user || hasPermission(user.roles, "users:manage");
  const rows = globalAccess
    ? db.prepare("SELECT * FROM cases ORDER BY updated_at DESC").all()
    : db.prepare("SELECT * FROM cases WHERE court_id=? OR created_by=? ORDER BY updated_at DESC").all(user.courtId ?? "", user.id);
  return rows.map((row) => caseRow(row as Record<string, unknown>));
}

export function getCase(id: string, user?: SessionUser) {
  const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (row && user && !canAccessCase(user.roles, user.courtId, String(row.court_id), user.id, String(row.created_by))) return null;
  return row ? caseRow(row) : null;
}

export function createCase(input: z.infer<typeof createCaseSchema>, user: SessionUser) {
  if (!canAccessCourt(user.roles, user.courtId, input.courtId)) throw new Error("COURT_ACCESS_FORBIDDEN");
  const id = crypto.randomUUID();
  const ts = nowIso();
  db.prepare(
    `INSERT INTO cases (
      id, case_number, year, court_id, case_type_id, court_level, status,
      plaintiff, defendant, representative, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.caseNumber,
    input.year,
    input.courtId,
    input.caseTypeId,
    input.courtLevel,
    input.plaintiff,
    input.defendant,
    input.representative ?? null,
    user.id,
    ts,
    ts,
  );
  appendAudit({ actorId: user.id, action: "case.create", entity: "case", entityId: id, payload: input });
  return getCase(id);
}

export function patchCase(id: string, input: z.infer<typeof patchCaseSchema>, user: SessionUser) {
  const current = getCase(id, user);
  if (!current) return null;
  if (current.status !== "DRAFT" && current.status !== "RETURNED") {
    throw new Error("CASE_NOT_EDITABLE");
  }
  const facts = input.facts ?? current.facts;
  const claims = input.claims ?? current.claims;
  const accruals = input.accruals ?? current.accruals;
  db.prepare(
    `UPDATE cases SET
      facts_json=?, claims_json=?, accruals_json=?, claim_structure=?, value_kind=?,
      stage=?, claim_amount=?, awarded_amount=?, prepaid=?, urgent=?, fee_relief=?,
      plaintiff=?, defendant=?, representative=?, updated_at=?
     WHERE id=?`,
  ).run(
    JSON.stringify(facts),
    JSON.stringify(claims),
    JSON.stringify(accruals),
    input.claimStructure ?? current.claimStructure,
    input.valueKind ?? current.valueKind,
    input.stage ?? current.stage,
    input.claimAmount ?? current.claimAmount,
    input.awardedAmount ?? current.awardedAmount ?? null,
    input.prepaid ?? current.prepaid,
    (input.urgent ?? current.urgent) ? 1 : 0,
    input.feeRelief ?? current.feeRelief,
    input.plaintiff ?? current.plaintiff,
    input.defendant ?? current.defendant,
    input.representative ?? current.representative ?? null,
    nowIso(),
    id,
  );
  appendAudit({ actorId: user.id, action: "case.patch", entity: "case", entityId: id, payload: input });
  return getCase(id);
}

function setStatus(id: string, from: CaseStatus, to: CaseStatus) {
  assertTransition(from, to);
  db.prepare("UPDATE cases SET status=?, updated_at=? WHERE id=?").run(to, nowIso(), id);
}

export function runCalculation(caseId: string, user: SessionUser) {
  const current = getCase(caseId, user);
  if (!current) throw new Error("CASE_NOT_FOUND");
  if (current.status === "DRAFT" || current.status === "RETURNED") {
    if (current.status === "RETURNED") setStatus(caseId, "RETURNED", "DRAFT");
    const fresh = getCase(caseId)!;
    setStatus(caseId, fresh.status as CaseStatus, "SUBMITTED");
  }
  const afterSubmit = getCase(caseId)!;
  setStatus(caseId, afterSubmit.status as CaseStatus, "CALCULATING");

  const input: CalculationInput = {
    caseId,
    courtId: afterSubmit.courtId as string,
    caseTypeId: afterSubmit.caseTypeId as string,
    courtLevel: afterSubmit.courtLevel as CalculationInput["courtLevel"],
    stage: afterSubmit.stage as CalculationInput["stage"],
    valueKind: afterSubmit.valueKind as CalculationInput["valueKind"],
    claimStructure: afterSubmit.claimStructure as CalculationInput["claimStructure"],
    claimAmount: Number(afterSubmit.claimAmount),
    awardedAmount: afterSubmit.awardedAmount == null ? undefined : Number(afterSubmit.awardedAmount),
    prepaid: Number(afterSubmit.prepaid),
    claims: afterSubmit.claims as ClaimItem[],
    accruals: afterSubmit.accruals as CalculationInput["accruals"],
    urgent: Boolean(afterSubmit.urgent),
    feeRelief: afterSubmit.feeRelief as FeeTreatment,
    caseFacts: afterSubmit.facts as CalculationInput["caseFacts"],
  };

  let result;
  try {
    result = calculateFees(input);
  } catch (error) {
    setStatus(caseId, "CALCULATING", "DRAFT");
    appendAudit({
      actorId: user.id,
      action: "calculation.failed",
      entity: "case",
      entityId: caseId,
      payload: { error: error instanceof Error ? error.message : "CALCULATION_FAILED" },
    });
    throw error;
  }
  const versionRow = db.prepare("SELECT COALESCE(MAX(version), 0) AS v FROM estimates WHERE case_id=?").get(caseId) as {
    v: number;
  };
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO estimates (id, case_id, version, status, input_json, result_json, rule_set_id, rule_set_version, created_by, created_at)
     VALUES (?, ?, ?, 'CALCULATED', ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    caseId,
    versionRow.v + 1,
    JSON.stringify(input),
    JSON.stringify(result),
    result.ruleSetId,
    result.ruleSetVersion,
    user.id,
    nowIso(),
  );
  setStatus(caseId, "CALCULATING", "CALCULATED");
  appendAudit({
    actorId: user.id,
    action: "calculation.completed",
    entity: "estimate",
    entityId: id,
    payload: { caseId, total: result.total, ruleSetVersion: result.ruleSetVersion },
  });
  return { id, caseId, version: versionRow.v + 1, result, createdAt: nowIso() };
}

export function getEstimate(id: string, user?: SessionUser) {
  const row = db.prepare("SELECT * FROM estimates WHERE id=?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  if (user && !getCase(String(row.case_id), user)) return null;
  return {
    id: row.id,
    caseId: row.case_id,
    version: row.version,
    status: row.status,
    input: JSON.parse(String(row.input_json)),
    result: JSON.parse(String(row.result_json)),
    ruleSetId: row.rule_set_id,
    ruleSetVersion: row.rule_set_version,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function listEstimates(caseId?: string, user?: SessionUser) {
  const globalAccess = !user || hasPermission(user.roles, "users:manage");
  const scopedCourtId = globalAccess ? undefined : user.courtId ?? "";
  let rows: unknown[];
  if (globalAccess && caseId) {
    rows = db.prepare("SELECT * FROM estimates WHERE case_id=? ORDER BY version DESC").all(caseId);
  } else if (globalAccess) {
    rows = db.prepare("SELECT * FROM estimates ORDER BY created_at DESC").all();
  } else if (caseId) {
    rows = db.prepare("SELECT e.* FROM estimates e JOIN cases c ON c.id=e.case_id WHERE e.case_id=? AND (c.court_id=? OR c.created_by=?) ORDER BY e.version DESC")
      .all(caseId, scopedCourtId, user!.id);
  } else {
    rows = db.prepare("SELECT e.* FROM estimates e JOIN cases c ON c.id=e.case_id WHERE c.court_id=? OR c.created_by=? ORDER BY e.created_at DESC")
      .all(scopedCourtId, user!.id);
  }
  return (rows as Record<string, unknown>[]).map((row) => ({
    id: row.id,
    caseId: row.case_id,
    version: row.version,
    status: row.status,
    result: JSON.parse(String(row.result_json)),
    ruleSetId: row.rule_set_id,
    ruleSetVersion: row.rule_set_version,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }));
}

export function submitReview(estimateId: string, user: SessionUser) {
  return db.transaction(() => {
    const est = getEstimate(estimateId, user);
    if (!est) throw new Error("ESTIMATE_NOT_FOUND");
    const c = getCase(est.caseId as string, user);
    if (!c) throw new Error("CASE_NOT_FOUND");
    const latest = db.prepare("SELECT id FROM estimates WHERE case_id=? ORDER BY version DESC LIMIT 1").get(est.caseId) as
      | { id: string }
      | undefined;
    assertCanSubmitReview({
      estimateId,
      latestEstimateId: latest?.id,
      estimateStatus: String(est.status),
      caseStatus: String(c.status),
      createdBy: String(est.createdBy),
    });
    setStatus(est.caseId as string, c.status as CaseStatus, "PENDING_REVIEW");
    db.prepare("UPDATE estimates SET status=? WHERE id=?").run("PENDING_REVIEW", estimateId);
    appendAudit({ actorId: user.id, action: "calculation.submit-review", entity: "estimate", entityId: estimateId, payload: {} });
    return getEstimate(estimateId);
  })();
}

export function decideReview(estimateId: string, action: "approve" | "return", reason: string | undefined, user: SessionUser) {
  return db.transaction(() => {
    const est = getEstimate(estimateId, user);
    if (!est) throw new Error("ESTIMATE_NOT_FOUND");
    const c = getCase(est.caseId as string, user);
    if (!c) throw new Error("CASE_NOT_FOUND");
    const latest = db.prepare("SELECT id FROM estimates WHERE case_id=? ORDER BY version DESC LIMIT 1").get(est.caseId) as
      | { id: string }
      | undefined;
    assertCanDecideReview(
      {
        estimateId,
        latestEstimateId: latest?.id,
        estimateStatus: String(est.status),
        caseStatus: String(c.status),
        createdBy: String(est.createdBy),
      },
      user.id,
    );
    const to: CaseStatus = action === "approve" ? "APPROVED" : "RETURNED";
    setStatus(est.caseId as string, c.status as CaseStatus, to);
    db.prepare("UPDATE estimates SET status=? WHERE id=?").run(action === "approve" ? "APPROVED" : "RETURNED", estimateId);
    if (action === "approve") {
      const latestCase = getCase(est.caseId as string)!;
      setStatus(est.caseId as string, latestCase.status as CaseStatus, "ISSUED");
      db.prepare("UPDATE estimates SET status=? WHERE id=?").run("ISSUED", estimateId);
    }
    db.prepare("INSERT INTO reviews (id, estimate_id, action, reason, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      crypto.randomUUID(),
      estimateId,
      action,
      reason ?? null,
      user.id,
      nowIso(),
    );
    appendAudit({
      actorId: user.id,
      action: action === "approve" ? "calculation.approve" : "calculation.return",
      entity: "estimate",
      entityId: estimateId,
      payload: { reason },
    });
    return getEstimate(estimateId);
  })();
}

export function dashboardStats(user: SessionUser) {
  const globalAccess = hasPermission(user.roles, "users:manage");
  const caseScope = globalAccess ? "" : " AND (court_id=? OR created_by=?)";
  const scopeValues = globalAccess ? [] : [user.courtId ?? "", user.id];
  const pendingCalc = db.prepare(`SELECT COUNT(*) AS c FROM cases WHERE status IN ('DRAFT','RETURNED','SUBMITTED')${caseScope}`).get(...scopeValues) as {
    c: number;
  };
  const pendingReview = db.prepare(`SELECT COUNT(*) AS c FROM cases WHERE status='PENDING_REVIEW'${caseScope}`).get(...scopeValues) as { c: number };
  const issued = db.prepare(`SELECT COUNT(*) AS c FROM cases WHERE status='ISSUED'${caseScope}`).get(...scopeValues) as { c: number };
  const recent = listEstimates(undefined, user).slice(0, 8);
  return {
    pendingAssessment: pendingCalc.c,
    pendingReview: pendingReview.c,
    issued: issued.c,
    collectionIsDemo: true,
    recent,
  };
}

export function listAudit(q?: string) {
  const rows = db.prepare("SELECT * FROM audit_events ORDER BY at DESC LIMIT 200").all() as Record<string, unknown>[];
  const mapped = rows.map((r) => ({
    id: r.id,
    at: r.at,
    actorId: r.actor_id,
    action: r.action,
    entity: r.entity,
    entityId: r.entity_id,
    payload: JSON.parse(String(r.payload_json)),
    prevHash: r.prev_hash,
    hash: r.hash,
  }));
  if (!q) return mapped;
  const needle = q.toLowerCase();
  return mapped.filter((e) => JSON.stringify(e).toLowerCase().includes(needle));
}

export function listUsers() {
  const users = db.prepare("SELECT id, username, display_name, email, phone, title_ar, court_id, active FROM users ORDER BY username COLLATE NOCASE").all() as Array<{
    id: string;
    username: string;
    display_name: string;
    email: string | null;
    phone: string | null;
    title_ar: string;
    court_id: string | null;
    active: number;
  }>;
  const roles = db.prepare("SELECT user_id, role_id FROM user_roles").all() as Array<{ user_id: string; role_id: RoleId }>;
  return users.map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    email: u.email,
    phone: u.phone,
    titleAr: u.title_ar,
    courtId: u.court_id,
    active: Boolean(u.active),
    roles: roles.filter((r) => r.user_id === u.id).map((r) => r.role_id),
  }));
}

export function searchUsers(input: { q?: string; roleId?: RoleId; active?: boolean; limit: number; offset: number }) {
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (input.q) {
    const escaped = input.q.replace(/[!%_]/g, (character) => `!${character}`);
    clauses.push("(username LIKE ? ESCAPE '!' OR display_name LIKE ? ESCAPE '!' OR email LIKE ? ESCAPE '!')");
    values.push(`%${escaped}%`, `%${escaped}%`, `%${escaped}%`);
  }
  if (input.roleId) {
    clauses.push("EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id=users.id AND r.role_id=?)");
    values.push(input.roleId);
  }
  if (input.active !== undefined) {
    clauses.push("active=?");
    values.push(input.active ? 1 : 0);
  }
  const where = whereClause(clauses);
  const total = (db.prepare(`SELECT COUNT(*) AS count FROM users ${where}`).get(...values) as { count: number }).count;
  const users = db.prepare(
    `SELECT id, username, display_name, email, phone, title_ar, court_id, active
     FROM users ${where} ORDER BY username COLLATE NOCASE LIMIT ? OFFSET ?`,
  ).all(...values, input.limit, input.offset) as Array<{
    id: string;
    username: string;
    display_name: string;
    email: string | null;
    phone: string | null;
    title_ar: string;
    court_id: string | null;
    active: number;
  }>;
  const ids = users.map((user) => user.id);
  const roles = ids.length
    ? db.prepare(`SELECT user_id, role_id FROM user_roles WHERE user_id IN (${ids.map(() => "?").join(",")})`).all(...ids) as Array<{ user_id: string; role_id: RoleId }>
    : [];
  return {
    items: users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      email: user.email,
      phone: user.phone,
      titleAr: user.title_ar,
      courtId: user.court_id,
      active: Boolean(user.active),
      roles: roles.filter((role) => role.user_id === user.id).map((role) => role.role_id),
    })),
    total,
  };
}

const EMPLOYEE_ROLES = new Set<RoleId>(["estimator", "supervisor", "legal_reviewer", "project_manager", "leader"]);
const SELF_MANAGED_ROLES = new Set<RoleId>(["citizen", ...EMPLOYEE_ROLES]);

export function registerCitizen(input: {
  username: string;
  displayName: string;
  email: string;
  phone?: string;
  password: string;
}) {
  const username = input.username.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;
  if (db.prepare("SELECT 1 FROM users WHERE username=? COLLATE NOCASE").get(username)) throw new Error("USERNAME_EXISTS");
  if (db.prepare("SELECT 1 FROM users WHERE email=? COLLATE NOCASE").get(email)) throw new Error("EMAIL_EXISTS");
  if (phone && db.prepare("SELECT 1 FROM users WHERE phone=?").get(phone)) throw new Error("PHONE_EXISTS");
  const id = crypto.randomUUID();
  const { hash, salt } = hashPassword(input.password);
  db.transaction(() => {
    db.prepare(
      `INSERT INTO users (id, username, display_name, email, phone, password_hash, password_salt, title_ar, court_id, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'مواطن', NULL, 1)`,
    ).run(id, username, input.displayName.trim(), email, phone, hash, salt);
    db.prepare("INSERT INTO user_roles (user_id, role_id) VALUES (?, 'citizen')").run(id);
    appendAudit({ actorId: id, action: "citizen.register", entity: "user", entityId: id, payload: { username } });
  })();
  return getUserProfile(id);
}

export function getUserProfile(id: string) {
  return db.prepare("SELECT id, username, display_name AS displayName, email, phone, title_ar AS titleAr, court_id AS courtId FROM users WHERE id=? AND active=1").get(id);
}

export function updateCitizenProfile(id: string, input: { displayName: string; email: string; phone?: string }) {
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;
  if (db.prepare("SELECT 1 FROM users WHERE email=? COLLATE NOCASE AND id<>?").get(email, id)) throw new Error("EMAIL_EXISTS");
  if (phone && db.prepare("SELECT 1 FROM users WHERE phone=? AND id<>?").get(phone, id)) throw new Error("PHONE_EXISTS");
  db.prepare("UPDATE users SET display_name=?, email=?, phone=? WHERE id=? AND active=1").run(input.displayName.trim(), email, phone, id);
  appendAudit({ actorId: id, action: "citizen.profile-update", entity: "user", entityId: id, payload: { email, hasPhone: Boolean(phone) } });
  return getUserProfile(id);
}

export function listCitizenServiceEstimates(userId: string) {
  return db.prepare(
    `SELECT se.id, se.service_id AS serviceId, se.pages, se.total, se.created_at AS createdAt
     FROM service_estimates se WHERE se.created_by=? ORDER BY se.created_at DESC LIMIT 100`,
  ).all(userId);
}

export interface AdminDashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: CaseStatus;
  serviceId?: string;
  roleId?: RoleId;
}

function dateConditions(column: string, filters: AdminDashboardFilters): { clauses: string[]; values: string[] } {
  const clauses: string[] = [];
  const values: string[] = [];
  if (filters.dateFrom) {
    clauses.push(`${column} >= ?`);
    values.push(`${filters.dateFrom}T00:00:00.000Z`);
  }
  if (filters.dateTo) {
    const endExclusive = new Date(`${filters.dateTo}T00:00:00.000Z`);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    clauses.push(`${column} < ?`);
    values.push(endExclusive.toISOString());
  }
  return { clauses, values };
}

function whereClause(clauses: string[]): string {
  return clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
}

export function adminDashboardStats(includeAdminActivity = false, filters: AdminDashboardFilters = {}) {
  const scalar = (sql: string, values: unknown[] = []) => (db.prepare(sql).get(...values) as { count: number }).count;
  const totalUsers = scalar("SELECT COUNT(*) AS count FROM users WHERE active=1");
  const citizenUsers = scalar("SELECT COUNT(DISTINCT u.id) AS count FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.active=1 AND r.role_id='citizen'");
  const staffUsers = scalar("SELECT COUNT(DISTINCT u.id) AS count FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.active=1 AND r.role_id NOT IN ('citizen','admin','super_admin','system_admin')");

  const caseFilters = dateConditions("created_at", filters);
  if (filters.status) {
    caseFilters.clauses.push("status=?");
    caseFilters.values.push(filters.status);
  }
  if (filters.roleId) {
    caseFilters.clauses.push("EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=cases.created_by AND ur.role_id=?)");
    caseFilters.values.push(filters.roleId);
  }
  const caseWhere = whereClause(caseFilters.clauses);
  const casesTotal = scalar(`SELECT COUNT(*) AS count FROM cases ${caseWhere}`, caseFilters.values);
  const issuedFilters = [...caseFilters.clauses, "status='ISSUED'"];
  const issued = scalar(`SELECT COUNT(*) AS count FROM cases ${whereClause(issuedFilters)}`, caseFilters.values);
  const casesByStatus = db.prepare(`SELECT status, COUNT(*) AS count FROM cases ${caseWhere} GROUP BY status ORDER BY status`).all(...caseFilters.values);

  const estimateFilters = dateConditions("e.created_at", filters);
  if (filters.status) {
    estimateFilters.clauses.push("c.status=?");
    estimateFilters.values.push(filters.status);
  }
  if (filters.roleId) {
    estimateFilters.clauses.push("EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=e.created_by AND ur.role_id=?)");
    estimateFilters.values.push(filters.roleId);
  }
  const estimateWhere = whereClause(estimateFilters.clauses);
  const estimatesTotal = scalar(`SELECT COUNT(*) AS count FROM estimates e JOIN cases c ON c.id=e.case_id ${estimateWhere}`, estimateFilters.values);
  const estimateRows = db.prepare(
    `SELECT e.id, e.case_id AS caseId, e.version, e.status, e.result_json AS resultJson,
            e.rule_set_id AS ruleSetId, e.rule_set_version AS ruleSetVersion, e.created_by AS createdBy, e.created_at AS createdAt
     FROM estimates e JOIN cases c ON c.id=e.case_id ${estimateWhere} ORDER BY e.created_at DESC LIMIT 8`,
  ).all(...estimateFilters.values) as Array<Record<string, unknown>>;
  const recentEstimates = estimateRows.map((row) => ({
    id: row.id,
    caseId: row.caseId,
    version: row.version,
    status: row.status,
    result: JSON.parse(String(row.resultJson)),
    ruleSetId: row.ruleSetId,
    ruleSetVersion: row.ruleSetVersion,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  }));

  const serviceFilters = dateConditions("created_at", filters);
  if (filters.serviceId) {
    serviceFilters.clauses.push("service_id=?");
    serviceFilters.values.push(filters.serviceId);
  }
  if (filters.roleId) {
    serviceFilters.clauses.push("EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=service_estimates.created_by AND ur.role_id=?)");
    serviceFilters.values.push(filters.roleId);
  }
  const serviceWhere = whereClause(serviceFilters.clauses);
  const servicesTotal = scalar(`SELECT COUNT(*) AS count FROM service_estimates ${serviceWhere}`, serviceFilters.values);
  const serviceAverage = db.prepare(`SELECT AVG(total) AS value FROM service_estimates ${serviceWhere}`).get(...serviceFilters.values) as { value: number | null };
  const servicesByUse = (db.prepare(
    `SELECT service_id AS serviceId, COUNT(*) AS count FROM service_estimates ${serviceWhere} GROUP BY service_id ORDER BY count DESC LIMIT 8`,
  ).all(...serviceFilters.values) as Array<{ serviceId: string; count: number }>).map((item) => ({
    ...item,
    serviceNameAr: SERVICE_CATALOG.find((service) => service.id === item.serviceId)?.nameAr ?? item.serviceId,
  }));
  const recentServices = db.prepare(
    `SELECT id, service_id AS serviceId, pages, total, created_at AS createdAt FROM service_estimates ${serviceWhere} ORDER BY created_at DESC LIMIT 8`,
  ).all(...serviceFilters.values);

  const usersByRole = db.prepare(
    "SELECT r.role_id AS roleId, COUNT(DISTINCT u.id) AS count FROM user_roles r JOIN users u ON u.id=r.user_id WHERE u.active=1 GROUP BY r.role_id ORDER BY count DESC",
  ).all();
  const adminActivity = includeAdminActivity
    ? db.prepare(
        `SELECT a.id, a.at, a.actor_id AS actorId, u.username, a.action, a.entity, a.entity_id AS entityId
         FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id
         WHERE a.action LIKE 'user.%' OR a.action LIKE 'rule.%' OR a.action LIKE 'security.%'
         ORDER BY a.at DESC LIMIT 12`,
      ).all()
    : undefined;
  return {
    users: { total: totalUsers, citizens: citizenUsers, employees: staffUsers },
    activity: { cases: casesTotal, calculations: estimatesTotal, serviceCalculations: servicesTotal },
    casesByStatus,
    servicesByUse,
    usersByRole,
    completion: { completed: issued, eligible: casesTotal, percentage: casesTotal ? (issued / casesTotal) * 100 : null },
    serviceEstimateAverage: serviceAverage.value,
    recentEstimates,
    recentServices,
    adminActivity,
  };
}

export const createManagedUserSchema = z.object({
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/),
  displayName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).optional(),
  phone: z.string().trim().min(6).max(30).optional(),
  password: z.string().min(12).max(200),
  roleId: z.enum(["citizen", "admin", "super_admin", "estimator", "supervisor", "legal_reviewer", "project_manager", "leader", "system_admin"]),
  courtId: z.string().optional(),
}).refine((input) => !EMPLOYEE_ROLES.has(input.roleId) || Boolean(input.courtId), {
  message: "COURT_REQUIRED",
  path: ["courtId"],
}).refine((input) => !input.courtId || COURTS.some((court) => court.id === input.courtId), {
  message: "INVALID_COURT",
  path: ["courtId"],
});

export function createManagedUser(input: z.infer<typeof createManagedUserSchema>, actor: SessionUser) {
  if (!hasPermission(actor.roles, "users:manage")) throw new Error("FORBIDDEN");
  if (!hasPermission(actor.roles, "security:manage") && !SELF_MANAGED_ROLES.has(input.roleId)) throw new Error("ROLE_ESCALATION_FORBIDDEN");
  if (db.prepare("SELECT 1 FROM users WHERE username=? COLLATE NOCASE").get(input.username)) throw new Error("USERNAME_EXISTS");
  const email = input.email?.toLowerCase() ?? null;
  const phone = input.phone || null;
  if (email && db.prepare("SELECT 1 FROM users WHERE email=? COLLATE NOCASE").get(email)) throw new Error("EMAIL_EXISTS");
  if (phone && db.prepare("SELECT 1 FROM users WHERE phone=?").get(phone)) throw new Error("PHONE_EXISTS");
  const id = crypto.randomUUID();
  const { hash, salt } = hashPassword(input.password);
  db.transaction(() => {
    db.prepare("INSERT INTO users (id, username, display_name, email, phone, password_hash, password_salt, title_ar, court_id, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
      .run(id, input.username.toLowerCase(), input.displayName, email, phone, hash, salt, ROLE_LABELS[input.roleId], input.courtId ?? null);
    db.prepare("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)").run(id, input.roleId);
    appendAudit({ actorId: actor.id, action: "user.create", entity: "user", entityId: id, payload: { username: input.username, roleId: input.roleId } });
  })();
  return listUsers().find((user) => user.id === id);
}

export const updateManagedUserSchema = z.object({
  active: z.boolean().optional(),
  roleId: z.enum(["citizen", "admin", "super_admin", "estimator", "supervisor", "legal_reviewer", "project_manager", "leader", "system_admin"]).optional(),
  courtId: z.string().nullable().optional(),
}).refine((input) => input.active !== undefined || input.roleId !== undefined || input.courtId !== undefined)
  .refine((input) => !input.courtId || COURTS.some((court) => court.id === input.courtId), {
    message: "INVALID_COURT",
    path: ["courtId"],
  });

function assertCanManageTarget(current: ReturnType<typeof listUsers>[number], input: z.infer<typeof updateManagedUserSchema>, actor: SessionUser) {
  const canManagePrivileged = hasPermission(actor.roles, "security:manage");
  const targetIsPrivileged = current.roles.some((role) => ["admin", "super_admin", "system_admin"].includes(role));
  if (!hasPermission(actor.roles, "users:manage")) throw new Error("FORBIDDEN");
  if (input.active === false && current.id === actor.id) throw new Error("SELF_DEACTIVATION_FORBIDDEN");
  if (input.courtId !== undefined && !canManagePrivileged) throw new Error("ROLE_ESCALATION_FORBIDDEN");
  if (canManagePrivileged) return;
  if (targetIsPrivileged || (input.roleId && !SELF_MANAGED_ROLES.has(input.roleId))) throw new Error("ROLE_ESCALATION_FORBIDDEN");
  if (input.roleId && current.roles.some((role) => !SELF_MANAGED_ROLES.has(role))) throw new Error("ROLE_ESCALATION_FORBIDDEN");
}

function requireAnotherActiveSuperAdmin(id: string): void {
  const remaining = db.prepare(
    "SELECT COUNT(*) AS count FROM users u JOIN user_roles r ON r.user_id=u.id WHERE r.role_id='super_admin' AND u.active=1 AND u.id<>?",
  ).get(id) as { count: number };
  if (remaining.count === 0) throw new Error("LAST_SUPER_ADMIN_REQUIRED");
}

export function updateManagedUser(id: string, input: z.infer<typeof updateManagedUserSchema>, actor: SessionUser) {
  const current = listUsers().find((user) => user.id === id);
  if (!current) return null;
  assertCanManageTarget(current, input, actor);
  const nextRole = input.roleId ?? current.roles[0];
  const nextCourtId = input.courtId !== undefined ? input.courtId : current.courtId;
  if (nextRole && EMPLOYEE_ROLES.has(nextRole) && !nextCourtId) throw new Error("COURT_REQUIRED");
  return db.transaction(() => {
    if (input.roleId) {
      if (current.roles.includes("super_admin") && input.roleId !== "super_admin") requireAnotherActiveSuperAdmin(id);
      db.prepare("DELETE FROM user_roles WHERE user_id=?").run(id);
      db.prepare("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)").run(id, input.roleId);
    }
    if (input.active !== undefined) {
      if (input.active === false && current.roles.includes("super_admin")) requireAnotherActiveSuperAdmin(id);
      db.prepare("UPDATE users SET active=? WHERE id=?").run(input.active ? 1 : 0, id);
    }
    if (input.courtId !== undefined) db.prepare("UPDATE users SET court_id=? WHERE id=?").run(input.courtId, id);
    appendAudit({ actorId: actor.id, action: "user.update", entity: "user", entityId: id, payload: { active: input.active, roleId: input.roleId, courtId: input.courtId } });
    return listUsers().find((user) => user.id === id);
  })();
}

export function createServiceEstimate(serviceId: CourtServiceId, pages: number, user: SessionUser) {
  const calc = calculateServiceFee(serviceId, pages);
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO service_estimates (id, service_id, pages, total, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, serviceId, pages, calc.total, user.id, nowIso());
  appendAudit({ actorId: user.id, action: "service.calculate", entity: "service-estimate", entityId: id, payload: calc });
  return { id, serviceId, pages, ...calc };
}

export function createRuleChange(payload: unknown, user: SessionUser) {
  if (!hasPermission(user.roles, "rule:create")) throw new Error("FORBIDDEN");
  const id = crypto.randomUUID();
  const ts = nowIso();
  db.prepare(
    "INSERT INTO rule_changes (id, status, payload_json, created_by, created_at, updated_at) VALUES (?, 'draft', ?, ?, ?, ?)",
  ).run(id, JSON.stringify(payload), user.id, ts, ts);
  appendAudit({ actorId: user.id, action: "rule.draft", entity: "rule-change", entityId: id, payload });
  return getRuleChange(id);
}

export function getRuleChange(id: string) {
  const row = db.prepare("SELECT * FROM rule_changes WHERE id=?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    payload: JSON.parse(String(row.payload_json)),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listRuleChanges() {
  return (db.prepare("SELECT * FROM rule_changes ORDER BY updated_at DESC").all() as Record<string, unknown>[]).map((row) => ({
    id: row.id,
    status: row.status,
    payload: JSON.parse(String(row.payload_json)),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function transitionRule(id: string, action: "submit" | "approve" | "reject" | "publish", user: SessionUser) {
  return db.transaction(() => {
    const current = getRuleChange(id);
    if (!current) throw new Error("NOT_FOUND");
    if (action === "approve" || action === "reject") assertCanReviewRule(String(current.createdBy), user.id);
    if (action === "publish" && !canPublish(current.status as "approved", hasPermission(user.roles, "rule:publish"))) {
      throw new Error("FORBIDDEN");
    }
    const next = nextRuleStatus(current.status as "draft", action);
    db.prepare("UPDATE rule_changes SET status=?, updated_at=? WHERE id=?").run(next, nowIso(), id);
    appendAudit({ actorId: user.id, action: `rule.${action}`, entity: "rule-change", entityId: id, payload: { next } });
    return getRuleChange(id);
  })();
}

export function reviewQueue(user: SessionUser) {
  return listEstimates(undefined, user).filter((estimate) => estimate.status === "PENDING_REVIEW");
}
