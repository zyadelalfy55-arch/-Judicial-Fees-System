/** 1 Egyptian pound = 1000 millieme. All arithmetic stays in integers. */
export const MILLIEME_PER_EGP = 1000;

export type Millieme = number;

export function assertMillieme(value: number): Millieme {
  if (!Number.isInteger(value)) {
    throw new Error("MONEY_NOT_INTEGER");
  }
  if (value < 0) {
    throw new Error("MONEY_NEGATIVE");
  }
  if (value > Number.MAX_SAFE_INTEGER) {
    throw new Error("MONEY_OVERFLOW");
  }
  return value;
}

export function egpToMillieme(egp: number): Millieme {
  if (!Number.isFinite(egp) || egp < 0) {
    throw new Error("INVALID_EGP");
  }
  return assertMillieme(Math.round(egp * MILLIEME_PER_EGP));
}

export function parseEgpInput(raw: string): Millieme {
  const trimmed = raw.trim().replace(/,/g, "");
  if (trimmed === "") throw new Error("EMPTY_AMOUNT");
  if (!/^\d+(\.\d{1,3})?$/.test(trimmed)) {
    throw new Error("INVALID_DECIMAL");
  }
  const [whole, frac = ""] = trimmed.split(".");
  const millieme = Number(whole) * MILLIEME_PER_EGP + Number(frac.padEnd(3, "0"));
  return assertMillieme(millieme);
}

/** Round half away from zero on integer millieme products. */
export function applyBps(amount: Millieme, bps: number): Millieme {
  if (!Number.isInteger(bps) || bps < 0) throw new Error("INVALID_BPS");
  const product = BigInt(amount) * BigInt(bps);
  const denom = 10_000n;
  const half = denom / 2n;
  const rounded = (product + half) / denom;
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("MONEY_OVERFLOW");
  return Number(rounded);
}

export function formatEgp(millieme: Millieme): string {
  const neg = millieme < 0;
  const abs = Math.abs(millieme);
  const pounds = Math.floor(abs / MILLIEME_PER_EGP);
  const frac = abs % MILLIEME_PER_EGP;
  const body = `${pounds.toLocaleString("en-EG")}.${String(frac).padStart(3, "0").slice(0, 3)}`;
  return neg ? `-${body}` : body;
}

export function formatEgpDisplay(millieme: Millieme): string {
  return `${formatEgp(millieme)} ج.م`;
}

export function minMillieme(a: Millieme, b: Millieme): Millieme {
  return a < b ? a : b;
}

export function addMillieme(...parts: Millieme[]): Millieme {
  return assertMillieme(parts.reduce((s, p) => s + p, 0));
}
