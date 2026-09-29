import { applyBps, assertMillieme, egpToMillieme } from "./money.ts";

export type CourtServiceId =
  | "registry-copy"
  | "certificate"
  | "judicial-paper-copy"
  | "named-search"
  | "theoretical-search"
  | "translation"
  | "order"
  | "cassation-memorandum"
  | "announcement"
  | "execution"
  | "attestation"
  | "power-of-attorney-attestation"
  | "signature-or-seal-certification"
  | "foreign-use-authentication";

export interface ServiceDefinition {
  id: CourtServiceId;
  nameAr: string;
  baseFee: number;
  perPageBps?: number;
  pagesField?: boolean;
}

export const SERVICE_CATALOG: ServiceDefinition[] = [
  { id: "registry-copy", nameAr: "صورة رسمية من السجل", baseFee: egpToMillieme(20), pagesField: true },
  { id: "certificate", nameAr: "شهادة", baseFee: egpToMillieme(15) },
  { id: "judicial-paper-copy", nameAr: "صورة ورقة قضائية", baseFee: egpToMillieme(10), pagesField: true },
  { id: "named-search", nameAr: "بحث بالاسم", baseFee: egpToMillieme(25) },
  { id: "theoretical-search", nameAr: "بحث نظري", baseFee: egpToMillieme(30) },
  { id: "translation", nameAr: "ترجمة", baseFee: egpToMillieme(50), pagesField: true },
  { id: "order", nameAr: "أمر", baseFee: egpToMillieme(40) },
  { id: "cassation-memorandum", nameAr: "مذكرة نقض", baseFee: egpToMillieme(80) },
  { id: "announcement", nameAr: "إعلان", baseFee: egpToMillieme(35) },
  { id: "execution", nameAr: "تنفيذ", baseFee: egpToMillieme(60) },
  { id: "attestation", nameAr: "تصديق", baseFee: egpToMillieme(25) },
  { id: "power-of-attorney-attestation", nameAr: "تصديق توكيل", baseFee: egpToMillieme(30) },
  { id: "signature-or-seal-certification", nameAr: "شهادة توقيع أو ختم", baseFee: egpToMillieme(20) },
  { id: "foreign-use-authentication", nameAr: "توثيق للاستعمال بالخارج", baseFee: egpToMillieme(100) },
];

export function calculateServiceFee(serviceId: CourtServiceId, pages = 1): { total: number; unverified: true } {
  const def = SERVICE_CATALOG.find((s) => s.id === serviceId);
  if (!def) throw new Error("UNKNOWN_SERVICE");
  if (!Number.isInteger(pages) || pages < 1) throw new Error("INVALID_PAGES");
  const extra = def.pagesField ? applyBps(def.baseFee, 200) * (pages - 1) : 0;
  return { total: assertMillieme(def.baseFee + extra), unverified: true };
}
