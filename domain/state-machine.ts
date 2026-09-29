import type { CaseStatus } from "./types.ts";

const TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["CALCULATING", "DRAFT"],
  CALCULATING: ["CALCULATED"],
  CALCULATED: ["PENDING_REVIEW", "DRAFT"],
  PENDING_REVIEW: ["APPROVED", "RETURNED"],
  RETURNED: ["DRAFT"],
  APPROVED: ["ISSUED"],
  ISSUED: [],
};

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: CaseStatus, to: CaseStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`ILLEGAL_STATE_TRANSITION:${from}->${to}`);
  }
}
