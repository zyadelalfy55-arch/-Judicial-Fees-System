import type { Permission, RoleId } from "./types.ts";

export const ROLE_LABELS: Record<RoleId, string> = {
  citizen: "مواطن",
  admin: "أدمن",
  super_admin: "سوبر أدمن",
  estimator: "مقدّر رسوم",
  supervisor: "مشرف / مراجع مالي",
  legal_reviewer: "مراجع قانوني",
  project_manager: "مدير حوكمة القواعد",
  leader: "قيادة تشغيلية",
  system_admin: "إدارة النظام",
};

const ALL: Permission[] = [
  "case:create",
  "case:view",
  "case:edit",
  "calculation:create",
  "calculation:view",
  "calculation:submit-review",
  "calculation:approve",
  "calculation:return",
  "rule:view",
  "rule:create",
  "rule:edit",
  "rule:review",
  "rule:publish",
  "audit:view",
  "audit:verify",
  "users:manage",
  "security:manage",
  "dashboard:view",
  "dashboard:admin",
  "citizen:portal",
  "citizen:profile",
  "services:calculate",
];

export const ROLE_PERMISSIONS: Record<RoleId, Permission[]> = {
  citizen: ["citizen:portal", "citizen:profile", "services:calculate"],
  admin: [
    "dashboard:view",
    "dashboard:admin",
    "case:view",
    "calculation:view",
    "rule:view",
    "audit:view",
    "users:manage",
    "services:calculate",
  ],
  super_admin: ALL.filter((p) => p !== "calculation:approve"),
  estimator: [
    "dashboard:view",
    "case:create",
    "case:view",
    "case:edit",
    "calculation:create",
    "calculation:view",
    "calculation:submit-review",
    "rule:view",
    "services:calculate",
  ],
  supervisor: [
    "dashboard:view",
    "case:view",
    "calculation:view",
    "calculation:approve",
    "calculation:return",
    "rule:view",
    "audit:view",
  ],
  legal_reviewer: [
    "dashboard:view",
    "case:view",
    "calculation:view",
    "rule:view",
    "rule:review",
    "audit:view",
  ],
  project_manager: [
    "dashboard:view",
    "rule:view",
    "rule:create",
    "rule:edit",
    "rule:publish",
    "audit:view",
  ],
  leader: ["dashboard:view", "case:view", "calculation:view", "audit:view", "rule:view"],
  system_admin: [
    "dashboard:view",
    "dashboard:admin",
    "case:view",
    "calculation:view",
    "rule:view",
    "audit:view",
    "users:manage",
    "services:calculate",
  ],
};

export function hasPermission(roles: RoleId[], permission: Permission): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission) ?? false);
}

export function canAccessCourt(roles: RoleId[], assignedCourtId: string | null, caseCourtId: string): boolean {
  if (hasPermission(roles, "users:manage")) return true;
  return assignedCourtId !== null && assignedCourtId === caseCourtId;
}

export function canAccessCase(
  roles: RoleId[],
  assignedCourtId: string | null,
  caseCourtId: string,
  actorId: string,
  creatorId: string,
): boolean {
  return hasPermission(roles, "users:manage") || creatorId === actorId || assignedCourtId === caseCourtId;
}
