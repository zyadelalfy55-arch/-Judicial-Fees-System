import type { CaseType, Court } from "./types.ts";

export const COURTS: Court[] = [
  { id: "cairo-appeals", nameAr: "محكمة استئناف القاهرة (دار القضاء العالي)", level: "appeal", group: "محاكم الاستئناف" },
  { id: "alex-appeals", nameAr: "محكمة استئناف الإسكندرية", level: "appeal", group: "محاكم الاستئناف" },
  { id: "tanta-appeals", nameAr: "محكمة استئناف طنطا", level: "appeal", group: "محاكم الاستئناف" },
  { id: "mansoura-appeals", nameAr: "محكمة استئناف المنصورة", level: "appeal", group: "محاكم الاستئناف" },
  { id: "south-cairo", nameAr: "محكمة جنوب القاهرة الابتدائية", level: "first-instance", group: "المحاكم الابتدائية" },
  { id: "north-cairo", nameAr: "محكمة شمال القاهرة الابتدائية", level: "first-instance", group: "المحاكم الابتدائية" },
  { id: "giza-primary", nameAr: "محكمة الجيزة الابتدائية", level: "first-instance", group: "المحاكم الابتدائية" },
  { id: "cairo-econ", nameAr: "المحكمة الاقتصادية بالقاهرة", level: "first-instance", group: "المحاكم المتخصصة" },
];

export const CASE_TYPES: CaseType[] = [
  { id: "civil", nameAr: "دعوى مدنية", defaultStructure: "single" },
  { id: "commercial", nameAr: "دعوى تجارية", defaultStructure: "single" },
  { id: "labor", nameAr: "دعوى عمالية", defaultStructure: "single" },
  { id: "rent", nameAr: "دعوى إيجارية / فسخ إيجار", defaultStructure: "rent-termination" },
  { id: "multi-claim", nameAr: "طلبات متعددة", defaultStructure: "different-bases" },
];

export function getCourt(id: string): Court {
  const court = COURTS.find((c) => c.id === id);
  if (!court) throw new Error("UNKNOWN_COURT");
  return court;
}

export function getCaseType(id: string): CaseType {
  const t = CASE_TYPES.find((c) => c.id === id);
  if (!t) throw new Error("UNKNOWN_CASE_TYPE");
  return t;
}
