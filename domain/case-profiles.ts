import type { CaseType, ClaimStructure, CourtLevel, FeeTreatment, Stage, ValueKind } from "./types.ts";

export interface CaseProfile {
  id: string;
  caseTypeId: string;
  courtLevel: CourtLevel;
  allowedStructures: ClaimStructure[];
  unknownValueForcesReview: boolean;
}

export const PROFILES: CaseProfile[] = [
  {
    id: "civil-first",
    caseTypeId: "civil",
    courtLevel: "first-instance",
    allowedStructures: ["single", "same-basis", "different-bases", "unsure"],
    unknownValueForcesReview: true,
  },
  {
    id: "commercial-any",
    caseTypeId: "commercial",
    courtLevel: "first-instance",
    allowedStructures: ["single", "same-basis", "different-bases", "unsure"],
    unknownValueForcesReview: true,
  },
  {
    id: "labor-first",
    caseTypeId: "labor",
    courtLevel: "first-instance",
    allowedStructures: ["single", "unsure"],
    unknownValueForcesReview: true,
  },
  {
    id: "rent-first",
    caseTypeId: "rent",
    courtLevel: "first-instance",
    allowedStructures: ["rent-termination", "single", "unsure"],
    unknownValueForcesReview: true,
  },
  {
    id: "multi-any",
    caseTypeId: "multi-claim",
    courtLevel: "first-instance",
    allowedStructures: ["different-bases", "same-basis", "unsure"],
    unknownValueForcesReview: true,
  },
];

export function resolveCaseProfile(input: {
  caseTypeId: string;
  courtLevel: CourtLevel;
}): CaseProfile {
  const exact = PROFILES.find(
    (p) => p.caseTypeId === input.caseTypeId && p.courtLevel === input.courtLevel,
  );
  if (exact) return exact;
  const byType = PROFILES.find((p) => p.caseTypeId === input.caseTypeId);
  if (byType) {
    return { ...byType, courtLevel: input.courtLevel, id: `${byType.id}-${input.courtLevel}` };
  }
  throw new Error("UNKNOWN_PROFILE");
}

export function validateProfileConstraints(
  profile: CaseProfile,
  structure: ClaimStructure,
  valueKind: ValueKind,
  stage: Stage,
  caseType: CaseType,
): string[] {
  const warnings: string[] = [];
  if (!profile.allowedStructures.includes(structure)) {
    throw new Error("STRUCTURE_NOT_ALLOWED");
  }
  if (valueKind === "unknown" && profile.unknownValueForcesReview) {
    warnings.push("UNKNOWN_VALUE_REQUIRES_REVIEW");
  }
  if (stage === "final" && structure === "unsure") {
    warnings.push("FINAL_STAGE_WITH_UNSURE_STRUCTURE");
  }
  if (caseType.defaultStructure !== structure && structure === "unsure") {
    warnings.push("STRUCTURE_MARKED_UNSURE");
  }
  return warnings;
}

export function resolveFeeTreatment(requested: FeeTreatment, valueKind: ValueKind): FeeTreatment {
  if (valueKind === "unknown") return "review";
  return requested;
}
