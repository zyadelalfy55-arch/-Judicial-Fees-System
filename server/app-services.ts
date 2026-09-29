import crypto from "node:crypto";
import { z } from "zod";
import { calculateFees } from "../domain/calculate.ts";
import { calculateServiceFee, type CourtServiceId } from "../domain/service-fees.ts";
import { assertCanReviewRule, canPublish, nextRuleStatus } from "../domain/governance.ts";
import { hasPermission } from "../domain/rbac.ts";
import { assertCanDecideReview, assertCanSubmitReview } from "../domain/review-policy.ts";
import { assertTransition } from "../domain/state-machine.ts";
import type { CalculationInput, CaseStatus, ClaimItem, FeeTreatment, RoleId } from "../domain/types.ts";
import { appendAudit } from "./audit.ts";
import { db, nowIso } from "./db.ts";
import type { SessionUser } from "./auth.ts";

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

export function listCases() {
  return db.prepare("SELECT * FROM cases ORDER BY updated_at DESC").all().map((r) => caseRow(r as Record<string, unknown>));
}

export function getCase(id: string) {
  const row = db.prepare("SELECT * FROM cases WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? caseRow(row) : null;
}

export function createCase(input: z.infer<typeof createCaseSchema>, user: SessionUser) {
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
  const current = getCase(id);
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
  const current = getCase(caseId);
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

export function getEstimate(id: string) {
  const row = db.prepare("SELECT * FROM estimates WHERE id=?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
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

export function listEstimates(caseId?: string) {
  const rows = caseId
    ? db.prepare("SELECT * FROM estimates WHERE case_id=? ORDER BY version DESC").all(caseId)
    : db.prepare("SELECT * FROM estimates ORDER BY created_at DESC").all();
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
    const est = getEstimate(estimateId);
    if (!est) throw new Error("ESTIMATE_NOT_FOUND");
    const c = getCase(est.caseId as string);
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
    const est = getEstimate(estimateId);
    if (!est) throw new Error("ESTIMATE_NOT_FOUND");
    const c = getCase(est.caseId as string);
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

export function dashboardStats() {
  const pendingCalc = db.prepare("SELECT COUNT(*) AS c FROM cases WHERE status IN ('DRAFT','RETURNED','SUBMITTED')").get() as {
    c: number;
  };
  const pendingReview = db.prepare("SELECT COUNT(*) AS c FROM cases WHERE status='PENDING_REVIEW'").get() as { c: number };
  const issued = db.prepare("SELECT COUNT(*) AS c FROM cases WHERE status='ISSUED'").get() as { c: number };
  const recent = listEstimates().slice(0, 8);
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
  const users = db.prepare("SELECT id, username, display_name, title_ar, court_id, active FROM users").all() as Array<{
    id: string;
    username: string;
    display_name: string;
    title_ar: string;
    court_id: string | null;
    active: number;
  }>;
  const roles = db.prepare("SELECT user_id, role_id FROM user_roles").all() as Array<{ user_id: string; role_id: RoleId }>;
  return users.map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    titleAr: u.title_ar,
    courtId: u.court_id,
    active: Boolean(u.active),
    roles: roles.filter((r) => r.user_id === u.id).map((r) => r.role_id),
  }));
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

export function reviewQueue() {
  return listEstimates().filter((e) => e.status === "PENDING_REVIEW");
}
