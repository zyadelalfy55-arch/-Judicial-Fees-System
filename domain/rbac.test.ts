import { describe, expect, it } from "vitest";
import { canAccessCase, canAccessCourt, hasPermission } from "./rbac.ts";

describe("role permissions", () => {
  it("keeps citizen access to their portal and service calculations only", () => {
    expect(hasPermission(["citizen"], "citizen:portal")).toBe(true);
    expect(hasPermission(["citizen"], "services:calculate")).toBe(true);
    expect(hasPermission(["citizen"], "case:view")).toBe(false);
    expect(hasPermission(["citizen"], "users:manage")).toBe(false);
    expect(hasPermission(["citizen"], "dashboard:admin")).toBe(false);
  });

  it("limits admins from security controls and super-admin provisioning", () => {
    expect(hasPermission(["admin"], "dashboard:admin")).toBe(true);
    expect(hasPermission(["admin"], "users:manage")).toBe(true);
    expect(hasPermission(["admin"], "security:manage")).toBe(false);
  });

  it("grants elevated account controls only to super admins", () => {
    expect(hasPermission(["super_admin"], "security:manage")).toBe(true);
    expect(hasPermission(["super_admin"], "users:manage")).toBe(true);
    expect(hasPermission(["super_admin"], "rule:publish")).toBe(true);
    expect(hasPermission(["super_admin"], "calculation:approve")).toBe(false);
    expect(hasPermission(["system_admin"], "security:manage")).toBe(false);
  });

  it("preserves existing employee permissions without administrative escalation", () => {
    expect(hasPermission(["estimator"], "case:create")).toBe(true);
    expect(hasPermission(["estimator"], "users:manage")).toBe(false);
    expect(hasPermission(["supervisor"], "calculation:approve")).toBe(true);
  });

  it("limits staff to their assigned court while allowing admin-level review", () => {
    expect(canAccessCourt(["estimator"], "cairo-econ", "cairo-econ")).toBe(true);
    expect(canAccessCourt(["estimator"], "cairo-econ", "cairo-appeals")).toBe(false);
    expect(canAccessCourt(["estimator"], null, "cairo-econ")).toBe(false);
    expect(canAccessCourt(["admin"], null, "cairo-appeals")).toBe(true);
    expect(canAccessCourt(["super_admin"], null, "cairo-appeals")).toBe(true);
  });

  it("preserves access to legacy cases created by the signed-in employee", () => {
    expect(canAccessCase(["estimator"], "cairo-econ", "mansoura-appeals", "u-estimator", "u-estimator")).toBe(true);
    expect(canAccessCase(["estimator"], "cairo-econ", "mansoura-appeals", "u-supervisor", "u-estimator")).toBe(false);
  });
});
