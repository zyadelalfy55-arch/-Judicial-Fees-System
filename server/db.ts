import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

function loadEnv(): void {
  const envPath = path.resolve(".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    process.env[key] ??= value;
  }
}
loadEnv();

const dataDir = path.resolve(process.env.DATABASE_PATH ? path.dirname(process.env.DATABASE_PATH) : "data");
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.resolve(process.env.DATABASE_PATH ?? path.join(dataDir, "jfs.sqlite"));

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  court_id TEXT,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  PRIMARY KEY (user_id, role_id)
);
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  case_number TEXT NOT NULL,
  year INTEGER NOT NULL,
  court_id TEXT NOT NULL,
  case_type_id TEXT NOT NULL,
  court_level TEXT NOT NULL,
  status TEXT NOT NULL,
  plaintiff TEXT NOT NULL,
  defendant TEXT NOT NULL,
  representative TEXT,
  facts_json TEXT NOT NULL DEFAULT '{}',
  claims_json TEXT NOT NULL DEFAULT '[]',
  accruals_json TEXT NOT NULL DEFAULT '[]',
  claim_structure TEXT NOT NULL DEFAULT 'single',
  value_kind TEXT NOT NULL DEFAULT 'known',
  stage TEXT NOT NULL DEFAULT 'filing',
  claim_amount INTEGER NOT NULL DEFAULT 0,
  awarded_amount INTEGER,
  prepaid INTEGER NOT NULL DEFAULT 0,
  urgent INTEGER NOT NULL DEFAULT 0,
  fee_relief TEXT NOT NULL DEFAULT 'standard',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS estimates (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  status TEXT NOT NULL,
  input_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  rule_set_id TEXT NOT NULL,
  rule_set_version TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  superseded INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  actor_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rule_changes (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  payload_json TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  original_name TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS service_estimates (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  pages INTEGER NOT NULL,
  total INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS cases_court_updated_idx ON cases(court_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS cases_creator_updated_idx ON cases(created_by, updated_at DESC);
CREATE INDEX IF NOT EXISTS estimates_case_version_idx ON estimates(case_id, version DESC);
`);

const userColumns = new Set(
  (db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>).map((column) => column.name),
);
if (!userColumns.has("email")) db.exec("ALTER TABLE users ADD COLUMN email TEXT");
if (!userColumns.has("phone")) db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email COLLATE NOCASE) WHERE email IS NOT NULL AND email <> '';
  CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique ON users(phone) WHERE phone IS NOT NULL AND phone <> '';
`);

export function nowIso(): string {
  return new Date().toISOString();
}
