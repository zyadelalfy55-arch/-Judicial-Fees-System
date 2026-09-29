export type RuleChangeStatus = "draft" | "in-review" | "approved" | "published" | "rejected";

export function assertCanReviewRule(createdBy: string, reviewerId: string): void {
  if (createdBy === reviewerId) throw new Error("RULE_CHANGE_SELF_REVIEW_FORBIDDEN");
}

export function canPublish(status: RuleChangeStatus, hasPublishPermission: boolean): boolean {
  return status === "approved" && hasPublishPermission;
}

export function nextRuleStatus(
  current: RuleChangeStatus,
  action: "submit" | "approve" | "reject" | "publish",
): RuleChangeStatus {
  if (action === "submit" && current === "draft") return "in-review";
  if (action === "approve" && current === "in-review") return "approved";
  if (action === "reject" && (current === "in-review" || current === "approved")) return "rejected";
  if (action === "publish" && current === "approved") return "published";
  throw new Error("ILLEGAL_RULE_TRANSITION");
}
