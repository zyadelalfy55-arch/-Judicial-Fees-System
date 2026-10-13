import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const originalDatabasePath = process.env.DATABASE_PATH;
const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "jfs-user-search-"));
process.env.DATABASE_PATH = path.join(tempDirectory, "users.sqlite");

const { db } = await import("./db.ts");
const { searchUsers } = await import("./app-services.ts");

beforeAll(() => {
  const insertUser = db.prepare(
    `INSERT INTO users (id, username, display_name, email, password_hash, password_salt, title_ar, court_id, active)
     VALUES (?, ?, ?, ?, 'hash', 'salt', 'title', NULL, ?)`,
  );
  const insertRole = db.prepare("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)");
  const seed = db.transaction(() => {
    const fixtureUsers = [
      { id: "search-1", username: "alpha.worker", displayName: "Alpha Worker", email: "alpha@example.test", role: "estimator", active: 1 },
      { id: "search-2", username: "beta.worker", displayName: "Beta Worker", email: "beta@example.test", role: "supervisor", active: 1 },
      { id: "search-3", username: "disabled.alpha", displayName: "Disabled Alpha", email: "disabled@example.test", role: "estimator", active: 0 },
    ];
    for (const user of fixtureUsers) {
      insertUser.run(user.id, user.username, user.displayName, user.email, user.active);
      insertRole.run(user.id, user.role);
    }
  });
  seed();
});

afterAll(() => {
  db.close();
  if (originalDatabasePath === undefined) delete process.env.DATABASE_PATH;
  else process.env.DATABASE_PATH = originalDatabasePath;
  fs.rmSync(tempDirectory, { recursive: true, force: true });
});

describe("managed user search", () => {
  it("combines text, role, and active-state filters", () => {
    const result = searchUsers({ q: "alpha", roleId: "estimator", active: true, limit: 10, offset: 0 });
    expect(result.total).toBe(1);
    expect(result.items.map((user) => user.username)).toEqual(["alpha.worker"]);
  });

  it("returns bounded pages and a full matching count", () => {
    const result = searchUsers({ limit: 1, offset: 1 });
    expect(result.total).toBe(3);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].username).toBe("beta.worker");
  });

  it("treats SQL wildcard characters in user input literally", () => {
    const result = searchUsers({ q: "%", limit: 10, offset: 0 });
    expect(result.total).toBe(0);
  });
});
