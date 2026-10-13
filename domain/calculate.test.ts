import { describe, expect, it } from "vitest";
import { applyBps, egpToMillieme, parseEgpInput } from "./money.ts";
import { calculateFees } from "./calculate.ts";
import { DEMO_RULE } from "./rule-parameters.ts";
import { assertTransition } from "./state-machine.ts";
import { calculateServiceFee } from "./service-fees.ts";
import { assertCanReviewRule } from "./governance.ts";

function baseInput(over: Partial<Parameters<typeof calculateFees>[0]> = {}) {
  return {
    courtId: "cairo-econ",
    caseTypeId: "commercial",
    courtLevel: "first-instance" as const,
    stage: "filing" as const,
    valueKind: "known" as const,
    claimStructure: "single" as const,
    claimAmount: egpToMillieme(100_000),
    claims: [],
    accruals: [],
    urgent: false,
    feeRelief: "standard" as const,
    caseFacts: {},
    ...over,
  };
}

describe("money", () => {
  it("parses decimals into millieme", () => {
    expect(parseEgpInput("1.5")).toBe(1500);
    expect(parseEgpInput("1.050")).toBe(1050);
  });
  it("rejects negatives and junk", () => {
    expect(() => parseEgpInput("-1")).toThrow();
    expect(() => parseEgpInput("1.2345")).toThrow();
  });
  it("applies bps with integer rounding", () => {
    expect(applyBps(1000, 500)).toBe(50);
  });
});

describe("golden calculation", () => {
  it("computes progressive relative fee for 3,750,000 EGP", () => {
    const result = calculateFees(baseInput({ claimAmount: egpToMillieme(3_750_000) }));
    const relative = result.feeLines.find((l) => l.code === "relative")!.amount;
    expect(relative).toBe(egpToMillieme(74_350));
    expect(result.ruleSetId).toBe(DEMO_RULE.ruleSetId);
    expect(result.warnings).toContain("UNVERIFIED_RULE_PACK");
    expect(result.requiresReview).toBe(true);
    expect(result.computationTrail.some((step) => step.id === "net-payable" && step.formula?.includes("max(0,"))).toBe(true);
    expect(result.total).toBeGreaterThan(relative);
  });

  it("applies minimum fee on tiny claims", () => {
    const result = calculateFees(baseInput({ claimAmount: egpToMillieme(1) }));
    expect(result.feeLines.find((l) => l.code === "relative")!.amount).toBe(DEMO_RULE.minimumRelativeFee);
  });

  it("caps oversized relative fee", () => {
    const result = calculateFees(baseInput({ claimAmount: egpToMillieme(50_000_000) }));
    expect(result.feeLines.find((l) => l.code === "relative")!.amount).toBe(DEMO_RULE.maximumRelativeFee);
  });

  it("zero claim yields zero relative before fixed lines", () => {
    const result = calculateFees(baseInput({ claimAmount: 0 }));
    expect(result.feeLines.find((l) => l.code === "relative")!.amount).toBe(0);
  });

  it("exempt zeroes all lines", () => {
    const result = calculateFees(baseInput({ feeRelief: "exempt" }));
    expect(result.total).toBe(0);
  });

  it("reduced halves via 5000 bps", () => {
    const full = calculateFees(baseInput());
    const reduced = calculateFees(baseInput({ feeRelief: "reduced" }));
    expect(reduced.feeLines.find((l) => l.code === "relative")!.amount).toBe(
      applyBps(full.feeLines.find((l) => l.code === "relative")!.amount, 5000),
    );
  });

  it("unknown value forces review", () => {
    const result = calculateFees(baseInput({ valueKind: "unknown", claimAmount: 0 }));
    expect(result.requiresReview).toBe(true);
    expect(result.feeTreatment).toBe("review");
  });

  it("subtracts prepaid without going negative", () => {
    const result = calculateFees(baseInput({ prepaid: egpToMillieme(1_000_000) }));
    expect(result.netPayable).toBe(0);
  });
});

describe("state machine", () => {
  it("blocks illegal approval from draft", () => {
    expect(() => assertTransition("DRAFT", "APPROVED")).toThrow();
  });
});

describe("rule governance", () => {
  it("prevents rule authors from reviewing their own changes", () => {
    expect(() => assertCanReviewRule("author-1", "author-1")).toThrow("RULE_CHANGE_SELF_REVIEW_FORBIDDEN");
    expect(() => assertCanReviewRule("author-1", "reviewer-1")).not.toThrow();
  });
});

describe("services", () => {
  it("charges extra pages", () => {
    const one = calculateServiceFee("registry-copy", 1);
    const two = calculateServiceFee("registry-copy", 2);
    expect(two.total).toBeGreaterThan(one.total);
    expect(one.unverified).toBe(true);
  });
});
