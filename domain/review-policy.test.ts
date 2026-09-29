import { describe, expect, it } from "vitest";
import { assertCanDecideReview, assertCanSubmitReview } from "./review-policy.ts";

const pendingEstimate = {
  estimateId: "estimate-2",
  latestEstimateId: "estimate-2",
  estimateStatus: "PENDING_REVIEW",
  caseStatus: "PENDING_REVIEW",
  createdBy: "estimator-1",
};

describe("review policy", () => {
  it("accepts only the current calculated estimate for review", () => {
    expect(() =>
      assertCanSubmitReview({
        ...pendingEstimate,
        estimateStatus: "CALCULATED",
        caseStatus: "CALCULATED",
      }),
    ).not.toThrow();
  });

  it("rejects an estimate superseded by a newer version", () => {
    expect(() =>
      assertCanSubmitReview({
        ...pendingEstimate,
        estimateId: "estimate-1",
        estimateStatus: "CALCULATED",
        caseStatus: "CALCULATED",
      }),
    ).toThrow("CALCULATION_SUPERSEDED");
  });

  it("rejects decisions unless both case and estimate are pending review", () => {
    expect(() =>
      assertCanDecideReview({ ...pendingEstimate, caseStatus: "CALCULATED" }, "reviewer-1"),
    ).toThrow("CALCULATION_NOT_PENDING_REVIEW");
  });

  it("prevents the creator from deciding their own estimate", () => {
    expect(() => assertCanDecideReview(pendingEstimate, "estimator-1")).toThrow("REVIEW_SELF_APPROVAL_FORBIDDEN");
  });

  it("allows a different reviewer to decide the latest pending estimate", () => {
    expect(() => assertCanDecideReview(pendingEstimate, "reviewer-1")).not.toThrow();
  });
});