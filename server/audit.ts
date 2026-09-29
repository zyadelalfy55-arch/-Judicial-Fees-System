import crypto from "node:crypto";
import { db, nowIso } from "./db.ts";

export interface AuditInput {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  payload: unknown;
}

export function appendAudit(input: AuditInput): void {
  const last = db.prepare("SELECT hash FROM audit_events ORDER BY at DESC, id DESC LIMIT 1").get() as
    | { hash: string }
    | undefined;
  const prevHash = last?.hash ?? "GENESIS";
  const id = crypto.randomUUID();
  const at = nowIso();
  const payload_json = JSON.stringify(input.payload);
  const hash = crypto
    .createHash("sha256")
    .update(`${prevHash}|${id}|${at}|${input.action}|${input.entity}|${input.entityId ?? ""}|${payload_json}`)
    .digest("hex");
  db.prepare(
    `INSERT INTO audit_events (id, at, actor_id, action, entity, entity_id, payload_json, prev_hash, hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, at, input.actorId ?? null, input.action, input.entity, input.entityId ?? null, payload_json, prevHash, hash);
}

export function verifyAuditChain(): { ok: boolean; checked: number } {
  const rows = db
    .prepare("SELECT id, at, action, entity, entity_id, payload_json, prev_hash, hash FROM audit_events ORDER BY at ASC, id ASC")
    .all() as Array<{
    id: string;
    at: string;
    action: string;
    entity: string;
    entity_id: string | null;
    payload_json: string;
    prev_hash: string;
    hash: string;
  }>;
  let prev = "GENESIS";
  for (const row of rows) {
    if (row.prev_hash !== prev) return { ok: false, checked: rows.length };
    const hash = crypto
      .createHash("sha256")
      .update(`${row.prev_hash}|${row.id}|${row.at}|${row.action}|${row.entity}|${row.entity_id ?? ""}|${row.payload_json}`)
      .digest("hex");
    if (hash !== row.hash) return { ok: false, checked: rows.length };
    prev = row.hash;
  }
  return { ok: true, checked: rows.length };
}
