import { egpToMillieme } from "./money.ts";
import type { EffectiveRule } from "./types.ts";

/**
 * DEMO / UNVERIFIED parameters.
 * These numbers are an engineering placeholder so the engine, trail, and tests
 * can run. They are not statutory fees and must not be cited as law.
 */
export const DEMO_RULE: EffectiveRule = {
  ruleSetId: "DEMO-JFS-RELATIVE",
  version: "0.1.0-unverified",
  nameAr: "حزمة قواعد نسبية تجريبية (غير معتمدة قانوناً)",
  verified: false,
  effectiveFrom: "2020-01-01",
  brackets: [
    { upTo: egpToMillieme(40_000), bps: 500 },
    { upTo: egpToMillieme(250_000), bps: 350 },
    { upTo: egpToMillieme(1_000_000), bps: 250 },
    { upTo: egpToMillieme(2_000_000), bps: 200 },
    { upTo: null, bps: 150 },
  ],
  minimumRelativeFee: egpToMillieme(40),
  maximumRelativeFee: egpToMillieme(100_000),
  fixedFilingFee: egpToMillieme(40),
  servicesFundBps: 1500,
  lawyerStampFee: egpToMillieme(20),
  reducedFactorBps: 5000,
  urgentSurchargeBps: 5000,
  sources: [
    {
      id: "SRC-UNVERIFIED",
      citationAr: "لم يُرفق مصدر تشريعي موثّق. يُستبدل هذا النص بعد مراجعة قانونية.",
      verified: false,
    },
  ],
};

export function resolveEffectiveRule(_asOf?: string): EffectiveRule {
  void _asOf;
  return DEMO_RULE;
}
