import type { Permission, RoleId } from "./types.ts";

export const ROLE_LABELS: Record<RoleId, string> = {
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
  "services:calculate",
];

export const ROLE_PERMISSIONS: Record<RoleId, Permission[]> = {
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
  system_admin: ALL.filter((p) => p !== "rule:publish" && p !== "calculation:approve"),
};

export function hasPermission(roles: RoleId[], permission: Permission): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role].includes(permission));
}
