export interface ReviewableEstimate {
  estimateId: string;
  latestEstimateId: string | undefined;
  estimateStatus: string;
  caseStatus: string;
  createdBy: string;
}

export function assertCanSubmitReview(estimate: ReviewableEstimate): void {
  if (estimate.estimateStatus !== "CALCULATED" || estimate.caseStatus !== "CALCULATED") {
    throw new Error("CALCULATION_NOT_REVIEWABLE");
  }
  if (estimate.estimateId !== estimate.latestEstimateId) {
    throw new Error("CALCULATION_SUPERSEDED");
  }
}

export function assertCanDecideReview(estimate: ReviewableEstimate, reviewerId: string): void {
  if (estimate.estimateStatus !== "PENDING_REVIEW" || estimate.caseStatus !== "PENDING_REVIEW") {
    throw new Error("CALCULATION_NOT_PENDING_REVIEW");
  }
  if (estimate.estimateId !== estimate.latestEstimateId) {
    throw new Error("CALCULATION_SUPERSEDED");
  }
  if (estimate.createdBy === reviewerId) {
    throw new Error("REVIEW_SELF_APPROVAL_FORBIDDEN");
  }
}