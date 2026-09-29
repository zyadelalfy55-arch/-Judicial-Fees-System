import { applyBps, assertMillieme, minMillieme } from "./money.ts";
import { getCaseType, getCourt } from "./catalog.ts";
import { resolveCaseProfile, resolveFeeTreatment, validateProfileConstraints } from "./case-profiles.ts";
import { resolveEffectiveRule } from "./rule-parameters.ts";
import type { CalculationInput, CalculationResult, ClaimItem, EffectiveRule, FeeLine, FeeTreatment, TrailStep } from "./types.ts";
import type { Millieme, Millieme as M } from "./money.ts";

function deriveClaimBasis(input: CalculationInput): { basis: M; notes: string[] } | null {
  const eligible = input.claims.filter((claim) => claim.disposition === "claimed" || claim.disposition === "awarded");
  if (eligible.length === 0) return null;

  if (input.claimStructure === "different-bases") {
    const groups = new Map<string, M>();
    for (const claim of eligible) {
      const key = claim.groupKey ?? claim.id;
      const amount = amountForClaim(claim, input.stage);
      const prev = groups.get(key) ?? 0;
      groups.set(key, claim.aggregation === "max" ? Math.max(prev, amount) : prev + amount);
    }
    const basis = [...groups.values()].reduce((sum, amount) => sum + amount, 0);
    return { basis: assertMillieme(basis), notes: ["تجميع الطلبات على أسس مختلفة حسب مفاتيح التجميع."] };
  }

  const claimsSum = eligible.reduce((sum, claim) => sum + amountForClaim(claim, input.stage), 0);
  if (input.claimStructure === "same-basis") {
    return { basis: assertMillieme(claimsSum), notes: ["طلبات على أساس واحد: يُجمع الوعاء."] };
  }
  if (input.claimStructure === "rent-termination") {
    const rentAccruals = input.accruals
      .filter((accrual) => accrual.kind === "rent" && (input.stage !== "filing" || accrual.filingBasis !== false))
      .reduce((sum, accrual) => sum + accrual.amount, 0);
    return {
      basis: assertMillieme(claimsSum + rentAccruals),
      notes: ["فسخ إيجار: الوعاء = الطلبات + المستحقات الإيجارية المحددة."],
    };
  }
  return null;
}

function deriveFinancialBasis(input: CalculationInput): { basis: M; notes: string[] } {
  if (input.valueKind === "unknown") {
    return { basis: 0, notes: ["قيمة المطالبة غير معلومة؛ يُستخدم تقدير صفري مع إلزام المراجعة."] };
  }

  if (input.claims.length > 0) {
    const claimBasis = deriveClaimBasis(input);
    if (claimBasis) return claimBasis;
  }

  const primary =
    input.stage === "final" && input.awardedAmount != null ? input.awardedAmount : input.claimAmount;
  const accrualAdd = input.accruals
    .filter((a) => (input.stage === "filing" ? a.filingBasis !== false : a.accruedToJudgment !== false))
    .reduce((s, a) => s + a.amount, 0);
  return { basis: assertMillieme(primary + accrualAdd), notes: [] };
}

function treatmentExplanation(treatment: FeeTreatment): string {
  switch (treatment) {
    case "standard":
      return "تم تطبيق الرسم القياسي (وفق الحزمة التجريبية).";
    case "reduced":
      return "رسم مخفّض وفق معامل تجريبي.";
    case "exempt":
      return "إعفاء من الرسم وفق التصنيف المدخل.";
    case "review":
      return "يستلزم الحساب مراجعة قانونية.";
  }
}

function amountForClaim(claim: ClaimItem, stage: CalculationInput["stage"]): M {
  if (stage === "final" && claim.disposition === "awarded" && claim.awardedAmount != null) {
    return claim.awardedAmount;
  }
  if (claim.disposition === "dismissed") return 0;
  if (claim.disposition === "settled") return claim.awardedAmount ?? claim.claimedAmount;
  return claim.claimedAmount;
}

function progressiveRelativeFee(basis: M, rule: EffectiveRule): { fee: M; slices: TrailStep[] } {
  const slices: TrailStep[] = [];
  let remainingPrev = 0;
  let total = 0;
  for (const [i, bracket] of rule.brackets.entries()) {
    const cap = bracket.upTo ?? Number.MAX_SAFE_INTEGER;
    if (basis <= remainingPrev) break;
    const slice = Math.min(basis, cap) - remainingPrev;
    const fee = applyBps(slice, bracket.bps);
    total += fee;
    slices.push({
      id: `bracket-${i}`,
      titleAr: `شريحة نسبية ${i + 1}`,
      detailAr: `أساس الشريحة ${slice} مليم × ${bracket.bps / 100}٪`,
      amount: fee,
      kind: "math",
    });
    remainingPrev = cap;
  }
  if (total < rule.minimumRelativeFee && basis > 0) {
    slices.push({
      id: "min-fee",
      titleAr: "حد أدنى للرسم النسبي",
      detailAr: "تطبيق الحد الأدنى التجريبي للحزمة غير المعتمدة.",
      amount: rule.minimumRelativeFee,
      kind: "gate",
    });
    total = rule.minimumRelativeFee;
  }
  if (rule.maximumRelativeFee != null && total > rule.maximumRelativeFee) {
    slices.push({
      id: "max-fee",
      titleAr: "سقف الرسم النسبي",
      detailAr: "تطبيق السقف التجريبي للحزمة غير المعتمدة.",
      amount: rule.maximumRelativeFee,
      kind: "gate",
    });
    total = rule.maximumRelativeFee;
  }
  return { fee: assertMillieme(total), slices };
}

function applyTreatment(amount: M, treatment: FeeTreatment, rule: EffectiveRule): M {
  if (treatment === "exempt") return 0;
  if (treatment === "reduced") return applyBps(amount, rule.reducedFactorBps);
  return amount;
}

export function calculateFees(input: CalculationInput, rule = resolveEffectiveRule(input.asOf)): CalculationResult {
  assertMillieme(input.claimAmount);
  if (input.prepaid != null) assertMillieme(input.prepaid);
  if (input.awardedAmount != null) assertMillieme(input.awardedAmount);

  const court = getCourt(input.courtId);
  const caseType = getCaseType(input.caseTypeId);
  const profile = resolveCaseProfile({ caseTypeId: input.caseTypeId, courtLevel: input.courtLevel });
  const profileWarnings = validateProfileConstraints(
    profile,
    input.claimStructure,
    input.valueKind,
    input.stage,
    caseType,
  );
  const treatment = resolveFeeTreatment(input.feeRelief, input.valueKind);
  const { basis, notes } = deriveFinancialBasis(input);
  const { fee: relativeRaw, slices } = progressiveRelativeFee(basis, rule);

  const relative = applyTreatment(relativeRaw, treatment, rule);
  const fixed = applyTreatment(rule.fixedFilingFee, treatment, rule);
  const stamp = applyTreatment(rule.lawyerStampFee, treatment, rule);
  const fund = applyTreatment(applyBps(relativeRaw, rule.servicesFundBps), treatment, rule);

  const lines: FeeLine[] = [
    { code: "relative", labelAr: "الرسم النسبي (تجريبي)", amount: relative, treatment },
    { code: "fixed", labelAr: "رسم قيد ثابت (تجريبي)", amount: fixed, treatment },
    { code: "services-fund", labelAr: "مقابل خدمات (تجريبي)", amount: fund, treatment },
    { code: "stamp", labelAr: "دمغة محاماة (تجريبي)", amount: stamp, treatment },
  ];

  let urgentFee = 0;
  if (input.urgent && treatment !== "exempt") {
    urgentFee = applyBps(relative + fixed, rule.urgentSurchargeBps);
    lines.push({
      code: "urgent",
      labelAr: "زيادة استعجال (تجريبي)",
      amount: urgentFee,
      treatment,
    });
  }

  const gross = lines.reduce((s, l) => s + l.amount, 0);
  const prepaid = input.prepaid ?? 0;
  const net = Math.max(0, gross - prepaid);

  const warnings = [...profileWarnings];
  if (!rule.verified) warnings.push("UNVERIFIED_RULE_PACK");
  if (treatment === "review" || input.claimStructure === "unsure" || input.valueKind === "unknown") {
    warnings.push("REVIEW_REQUIRED");
  }
  if (court.level !== input.courtLevel) {
    warnings.push("COURT_LEVEL_MISMATCH");
  }

  const trail: TrailStep[] = [
    {
      id: "facts",
      titleAr: "البيانات المدخلة",
      detailAr: `${court.nameAr} — ${caseType.nameAr} — مرحلة ${input.stage === "filing" ? "رفع" : "ختامي"} — هيكل ${input.claimStructure}`,
      kind: "fact",
    },
    {
      id: "basis",
      titleAr: "الوعاء المالي المشتق",
      detailAr: notes.join(" ") || "الوعاء من قيمة المطالبة/المحكوم به والمستحقات المسموح بها.",
      amount: basis,
      kind: "derivation",
    },
    {
      id: "rule",
      titleAr: "القاعدة المطبقة",
      detailAr: `${rule.ruleSetId} / ${rule.version} — ${rule.verified ? "مصدر موثّق" : "حزمة غير موثّقة"}`,
      kind: "rule",
    },
    {
      id: "treatment",
      titleAr: "معاملة الرسم",
      detailAr: treatmentExplanation(treatment),
      kind: "gate",
    },
    ...slices,
  ];

  return {
    total: assertMillieme(gross),
    netPayable: assertMillieme(net),
    feeLines: lines,
    warnings,
    assumptions: [
      "الحساب محرك خادمي مستقل عن الواجهة.",
      "المعاملات المالية تجريبية حتى اعتماد قاعدة قانونية موثّقة.",
      ...notes,
    ],
    sources: rule.sources,
    ruleSetId: rule.ruleSetId,
    ruleSetVersion: rule.version,
    appliedRuleChanges: [],
    computationTrail: trail,
    derivedValues: {
      financialBasis: basis,
      relativeRaw,
      prepaid,
      courtId: input.courtId,
      caseTypeId: input.caseTypeId,
      treatment,
    },
    feeTreatment: treatment,
    requiresReview: warnings.includes("REVIEW_REQUIRED") || treatment === "review",
  };
}

export function minCap(a: Millieme, cap: Millieme): Millieme {
  return minMillieme(a, cap);
}
