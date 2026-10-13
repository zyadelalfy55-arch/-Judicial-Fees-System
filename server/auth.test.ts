import { describe, expect, it } from "vitest";
import { hashPassword, readSession, signSession, verifyPassword } from "./auth.ts";

const citizenSession = {
  id: "test-user",
  username: "citizen-test",
  displayName: "مواطن تجريبي",
  titleAr: "مواطن",
  courtId: null,
  roles: ["citizen" as const],
};

describe("session authentication", () => {
  it("stores password verifiers rather than reusable plaintext", () => {
    const { hash, salt } = hashPassword("a-long-test-password");
    expect(hash).not.toBe("a-long-test-password");
    expect(verifyPassword("a-long-test-password", hash, salt)).toBe(true);
    expect(verifyPassword("a-different-password", hash, salt)).toBe(false);
  });

  it("signs a role-bearing session with claims validated by the server", async () => {
    const token = await signSession(citizenSession);
    await expect(readSession(token)).resolves.toMatchObject(citizenSession);
    await expect(readSession(`${token.slice(0, -1)}x`)).rejects.toThrow();
  });

  it("rejects an example signing secret in production mode", async () => {
    const previousMode = process.env.APP_MODE;
    const previousSecret = process.env.SESSION_SECRET;
    try {
      process.env.APP_MODE = "production";
      process.env.SESSION_SECRET = "replace-this-with-a-private-random-secret-of-at-least-32-characters";
      await expect(signSession(citizenSession)).rejects.toThrow("non-example SESSION_SECRET");
      process.env.SESSION_SECRET = "dev-only-change-me-please-32chars!!";
      await expect(signSession(citizenSession)).rejects.toThrow("non-example SESSION_SECRET");
    } finally {
      if (previousMode === undefined) delete process.env.APP_MODE;
      else process.env.APP_MODE = previousMode;
      if (previousSecret === undefined) delete process.env.SESSION_SECRET;
      else process.env.SESSION_SECRET = previousSecret;
    }
  });
});
