import type { Millieme } from "./money.ts";

export type CourtLevel = "first-instance" | "appeal" | "cassation";
export type Stage = "filing" | "final";
export type ValueKind = "known" | "unknown" | "estimate";
export type ClaimStructure =
  | "single"
  | "same-basis"
  | "different-bases"
  | "rent-termination"
  | "unsure";
export type FeeTreatment = "standard" | "reduced" | "exempt" | "review";
export type CaseStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "CALCULATING"
  | "CALCULATED"
  | "PENDING_REVIEW"
  | "RETURNED"
  | "APPROVED"
  | "ISSUED";
export type RoleId =
  | "citizen"
  | "admin"
  | "super_admin"
  | "estimator"
  | "supervisor"
  | "legal_reviewer"
  | "project_manager"
  | "leader"
  | "system_admin";
export type AccrualKind = "rent" | "yield" | "daily-compensation" | "interest";
export type ClaimDisposition = "claimed" | "awarded" | "dismissed" | "settled" | "other";
export type RequestKind = "primary" | "additional" | "alternative";

export type Permission =
  | "case:create"
  | "case:view"
  | "case:edit"
  | "calculation:create"
  | "calculation:view"
  | "calculation:submit-review"
  | "calculation:approve"
  | "calculation:return"
  | "rule:view"
  | "rule:create"
  | "rule:edit"
  | "rule:review"
  | "rule:publish"
  | "audit:view"
  | "audit:verify"
  | "users:manage"
  | "security:manage"
  | "dashboard:view"
  | "dashboard:admin"
  | "citizen:portal"
  | "citizen:profile"
  | "services:calculate";

export interface Court {
  id: string;
  nameAr: string;
  level: CourtLevel;
  group: string;
}

export interface CaseType {
  id: string;
  nameAr: string;
  defaultStructure: ClaimStructure;
}

export interface PartyInput {
  role: "plaintiff" | "defendant" | "representative";
  name: string;
  nationalId?: string;
  exemptionClass?: "none" | "reduced" | "exempt";
}

export interface ClaimItem {
  id: string;
  label: string;
  requestKind: RequestKind;
  valueKind: ValueKind;
  disposition: ClaimDisposition;
  aggregation?: "sum" | "max" | "independent";
  groupKey?: string;
  claimedAmount: Millieme;
  awardedAmount?: Millieme;
}

export interface AccrualInput {
  kind: AccrualKind;
  amount: Millieme;
  filingBasis?: boolean;
  accruedToJudgment?: boolean;
}

export interface CaseFacts {
  obligationDate?: string;
  multipleDefendants?: boolean;
  independentInterests?: boolean;
  geographicNotes?: string;
  notes?: string;
}

export interface CalculationInput {
  caseId?: string;
  courtId: string;
  caseTypeId: string;
  courtLevel: CourtLevel;
  stage: Stage;
  valueKind: ValueKind;
  claimStructure: ClaimStructure;
  claimAmount: Millieme;
  awardedAmount?: Millieme;
  prepaid?: Millieme;
  settlementAmount?: Millieme;
  finalOutcome?: string;
  finalTiming?: string;
  claims: ClaimItem[];
  accruals: AccrualInput[];
  urgent: boolean;
  feeRelief: FeeTreatment;
  caseFacts: CaseFacts;
  asOf?: string;
}

export interface FeeLine {
  code: string;
  labelAr: string;
  amount: Millieme;
  treatment: FeeTreatment;
}

export interface TrailStep {
  id: string;
  titleAr: string;
  detailAr: string;
  amount?: Millieme;
  kind: "fact" | "derivation" | "rule" | "gate" | "math";
  formula?: string;
  sourceIds?: string[];
}

export interface CalculationResult {
  total: Millieme;
  netPayable: Millieme;
  feeLines: FeeLine[];
  warnings: string[];
  assumptions: string[];
  sources: { id: string; citationAr: string; verified: boolean }[];
  ruleSetId: string;
  ruleSetVersion: string;
  appliedRuleChanges: string[];
  computationTrail: TrailStep[];
  derivedValues: Record<string, Millieme | string | boolean>;
  feeTreatment: FeeTreatment;
  requiresReview: boolean;
}

export interface EffectiveRule {
  ruleSetId: string;
  version: string;
  nameAr: string;
  verified: boolean;
  effectiveFrom: string;
  brackets: { upTo: Millieme | null; bps: number }[];
  minimumRelativeFee: Millieme;
  maximumRelativeFee: Millieme | null;
  fixedFilingFee: Millieme;
  servicesFundBps: number;
  lawyerStampFee: Millieme;
  reducedFactorBps: number;
  urgentSurchargeBps: number;
  sources: { id: string; citationAr: string; verified: boolean }[];
}
