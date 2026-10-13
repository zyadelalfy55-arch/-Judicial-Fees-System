import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { RoleId } from "../domain/types.ts";

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  titleAr: string;
  courtId: string | null;
  roles: RoleId[];
}

function sessionSecret(): Uint8Array {
  const configured = process.env.SESSION_SECRET;
  const production = process.env.NODE_ENV === "production" || process.env.APP_MODE === "production";
  const value = configured ?? "dev-only-change-me-please-32chars!!";
  if (production && (!configured || value === "dev-only-change-me-please-32chars!!" || /^(change-me|replace-this)/i.test(value))) {
    throw new Error("Set a private, non-example SESSION_SECRET before production startup.");
  }
  if (value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
  return new TextEncoder().encode(value);
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")): { hash: string; salt: string } {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const check = crypto.scryptSync(password, salt, 64);
  const actual = Buffer.from(hash, "hex");
  if (check.length !== actual.length) return false;
  return crypto.timingSafeEqual(check, actual);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    username: user.username,
    displayName: user.displayName,
    titleAr: user.titleAr,
    courtId: user.courtId,
    roles: user.roles,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("judicial-fees-system")
    .setAudience("judicial-fees-web")
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(sessionSecret());
}

export async function readSession(token: string): Promise<SessionUser> {
  const { payload } = await jwtVerify(token, sessionSecret(), {
    issuer: "judicial-fees-system",
    audience: "judicial-fees-web",
    algorithms: ["HS256"],
  });
  return {
    id: String(payload.sub),
    username: String(payload.username),
    displayName: String(payload.displayName),
    titleAr: String(payload.titleAr),
    courtId: (payload.courtId as string | null) ?? null,
    roles: (payload.roles as RoleId[]) ?? [],
  };
}
