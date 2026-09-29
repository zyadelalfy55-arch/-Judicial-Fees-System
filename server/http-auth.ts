import type { FastifyReply, FastifyRequest } from "fastify";
import type { Permission } from "../domain/types.ts";
import { hasPermission } from "../domain/rbac.ts";
import { readSession, type SessionUser } from "./auth.ts";

declare module "fastify" {
  interface FastifyRequest {
    user: SessionUser | null;
  }
}

export async function attachUser(request: FastifyRequest): Promise<void> {
  const token = request.cookies.jfs_session;
  if (!token) {
    request.user = null;
    return;
  }
  try {
    request.user = await readSession(token);
  } catch {
    request.user = null;
  }
}

export function requireUser(request: FastifyRequest, reply: FastifyReply): SessionUser | null {
  if (!request.user) {
    void reply.code(401).send({ error: "UNAUTHENTICATED", message: "يلزم تسجيل الدخول." });
    return null;
  }
  return request.user;
}

export function requirePermission(
  request: FastifyRequest,
  reply: FastifyReply,
  permission: Permission,
): SessionUser | null {
  const user = requireUser(request, reply);
  if (!user) return null;
  if (!hasPermission(user.roles, permission)) {
    void reply.code(403).send({ error: "FORBIDDEN", message: "لا صلاحية لهذا الإجراء." });
    return null;
  }
  return user;
}

export const COOKIE_NAME = "jfs_session";
export const cookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
