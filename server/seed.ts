import crypto from "node:crypto";
import { hashPassword } from "./auth.ts";
import { db, nowIso } from "./db.ts";
import { appendAudit } from "./audit.ts";
import type { RoleId } from "../domain/types.ts";

const DEMO_USERS: Array<{
  id: string;
  username: string;
  displayName: string;
  titleAr: string;
  password: string;
  courtId: string;
  roles: RoleId[];
}> = [
  {
    id: "u-estimator",
    username: "estimator",
    displayName: "هشام عبد الرحمن",
    titleAr: "مأمور تقدير الرسوم",
    password: "demo-estimator",
    courtId: "cairo-econ",
    roles: ["estimator"],
  },
  {
    id: "u-supervisor",
    username: "supervisor",
    displayName: "منى فؤاد",
    titleAr: "المراجع المالي",
    password: "demo-supervisor",
    courtId: "cairo-econ",
    roles: ["supervisor"],
  },
  {
    id: "u-legal",
    username: "legal",
    displayName: "كريم الشافعي",
    titleAr: "مراجع قانوني",
    password: "demo-legal",
    courtId: "cairo-appeals",
    roles: ["legal_reviewer"],
  },
  {
    id: "u-pm",
    username: "governance",
    displayName: "سلوى نبيل",
    titleAr: "مدير حوكمة القواعد",
    password: "demo-governance",
    courtId: "cairo-appeals",
    roles: ["project_manager"],
  },
  {
    id: "u-leader",
    username: "leader",
    displayName: "المستشار أحمد حسني",
    titleAr: "قيادة تشغيلية",
    password: "demo-leader",
    courtId: "cairo-appeals",
    roles: ["leader"],
  },
  {
    id: "u-admin",
    username: "admin",
    displayName: "إدارة النظام",
    titleAr: "إدارة النظام",
    password: "demo-admin",
    courtId: "cairo-appeals",
    roles: ["system_admin"],
  },
];

export function isDemoUserId(id: string): boolean {
  return DEMO_USERS.some((user) => user.id === id);
}

export function seedIfEmpty(): void {
  if (process.env.NODE_ENV === "production" || process.env.APP_MODE === "production") return;
  const row = db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };
  if (row.c > 0) return;
  const insertUser = db.prepare(
    `INSERT INTO users (id, username, display_name, password_hash, password_salt, title_ar, court_id, active)
     VALUES (@id, @username, @display_name, @password_hash, @password_salt, @title_ar, @court_id, 1)`,
  );
  const insertRole = db.prepare("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)");
  const tx = db.transaction(() => {
    for (const user of DEMO_USERS) {
      const { hash, salt } = hashPassword(user.password);
      insertUser.run({
        id: user.id,
        username: user.username,
        display_name: user.displayName,
        password_hash: hash,
        password_salt: salt,
        title_ar: user.titleAr,
        court_id: user.courtId,
      });
      for (const role of user.roles) insertRole.run(user.id, role);
    }
    db.prepare(
      `INSERT INTO rule_changes (id, status, payload_json, created_by, created_at, updated_at)
       VALUES (?, 'published', ?, 'system', ?, ?)`,
    ).run(
      crypto.randomUUID(),
      JSON.stringify({
        note: "حزمة DEMO غير موثّقة. لا تُعامل كنص قانوني.",
        ruleSetId: "DEMO-JFS-RELATIVE",
        version: "0.1.0-unverified",
      }),
      nowIso(),
      nowIso(),
    );
  });
  tx();
  appendAudit({
    actorId: "system",
    action: "seed.demo",
    entity: "system",
    payload: { mode: process.env.APP_MODE ?? "demo" },
  });
}

export function bootstrapSuperAdmin(): void {
  const username = process.env.BOOTSTRAP_SUPER_ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD;
  const displayName = process.env.BOOTSTRAP_SUPER_ADMIN_DISPLAY_NAME?.trim();
  const configured = [username, password, displayName].filter(Boolean).length;
  if (configured === 0) return;
  if (configured !== 3 || !/^[a-z0-9._-]{3,40}$/.test(username!) || password!.length < 14) {
    throw new Error("Configure a valid bootstrap username, display name, and password of at least 14 characters.");
  }
  const active = db.prepare("SELECT COUNT(*) AS count FROM users u JOIN user_roles r ON r.user_id=u.id WHERE r.role_id='super_admin' AND u.active=1").get() as { count: number };
  if (active.count > 0) return;
  const existing = db.prepare("SELECT id FROM users WHERE username=? COLLATE NOCASE").get(username);
  if (existing) throw new Error("Bootstrap username already exists; choose a different username.");
  const id = crypto.randomUUID();
  const { hash, salt } = hashPassword(password!);
  db.transaction(() => {
    db.prepare(
      `INSERT INTO users (id, username, display_name, email, phone, password_hash, password_salt, title_ar, court_id, active)
       VALUES (?, ?, ?, NULL, NULL, ?, ?, 'مدير النظام الأعلى', NULL, 1)`,
    ).run(id, username, displayName, hash, salt);
    db.prepare("INSERT INTO user_roles (user_id, role_id) VALUES (?, 'super_admin')").run(id);
    appendAudit({ actorId: id, action: "user.bootstrap-super-admin", entity: "user", entityId: id, payload: { username } });
  })();
}
