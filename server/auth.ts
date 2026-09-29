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

const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? "dev-only-change-me-please-32chars!!");

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
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function readSession(token: string): Promise<SessionUser> {
  const { payload } = await jwtVerify(token, secret);
  return {
    id: String(payload.sub),
    username: String(payload.username),
    displayName: String(payload.displayName),
    titleAr: String(payload.titleAr),
    courtId: (payload.courtId as string | null) ?? null,
    roles: (payload.roles as RoleId[]) ?? [],
  };
}
