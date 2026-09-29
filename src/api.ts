export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const res = await fetch(path, { ...init, headers, credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? "ERROR", data.message ?? data.error ?? "طلب غير ناجح");
  }
  return data as T;
}

export const api = {
  me: () => request<{ user: SessionUser; mode: string }>("/api/auth/me"),
  login: (body: { username: string; password: string; courtId?: string }) =>
    request<{ user: SessionUser; mode: string }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  catalog: () => request<Catalog>("/api/catalog"),
  dashboard: () => request<Dashboard>("/api/dashboard"),
  cases: () => request<{ items: CaseRecord[] }>("/api/cases"),
  case: (id: string) => request<CaseRecord>(`/api/cases/${id}`),
  createCase: (body: unknown) => request<CaseRecord>("/api/cases", { method: "POST", body: JSON.stringify(body) }),
  patchCase: (id: string, body: unknown) => request<CaseRecord>(`/api/cases/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  calculate: (caseId: string) => request<Estimate>(`/api/cases/${caseId}/calculate`, { method: "POST" }),
  estimate: (id: string) => request<Estimate>(`/api/calculations/${id}`),
  estimates: (caseId?: string) =>
    request<{ items: Estimate[] }>(`/api/calculations${caseId ? `?caseId=${caseId}` : ""}`),
  submitReview: (id: string) => request(`/api/calculations/${id}/submit-review`, { method: "POST" }),
  approve: (id: string, reason?: string) =>
    request(`/api/calculations/${id}/approve`, { method: "POST", body: JSON.stringify({ reason }) }),
  returnCalc: (id: string, reason: string) =>
    request(`/api/calculations/${id}/return`, { method: "POST", body: JSON.stringify({ reason }) }),
  reviewQueue: () => request<{ items: Estimate[] }>("/api/review-queue"),
  rules: () => request<{ published: unknown; changes: unknown[] }>("/api/rules"),
  audit: (q?: string) => request<{ items: AuditEvent[]; chain?: { ok: boolean; checked: number } }>(`/api/audit${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  users: () => request<{ items: SessionUser[] }>("/api/users"),
  services: () => request<{ items: { id: string; nameAr: string; baseFee: number }[]; unverified: boolean }>("/api/services"),
  calcService: (serviceId: string, pages: number) =>
    request("/api/services/calculate", { method: "POST", body: JSON.stringify({ serviceId, pages }) }),
  health: () => request<{ ok: boolean; mode: string }>("/api/health"),
};

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  titleAr: string;
  courtId: string | null;
  roles: string[];
}

export interface Catalog {
  courts: { id: string; nameAr: string; level: string; group: string }[];
  caseTypes: { id: string; nameAr: string; defaultStructure: string }[];
  services: { id: string; nameAr: string }[];
  demoRule: { ruleSetId: string; version: string; verified: boolean; nameAr: string };
  roles: Record<string, string>;
}

export interface CaseRecord {
  id: string;
  caseNumber: string;
  year: number;
  courtId: string;
  caseTypeId: string;
  courtLevel: string;
  status: string;
  plaintiff: string;
  defendant: string;
  representative?: string | null;
  facts: Record<string, unknown>;
  claims: unknown[];
  accruals: unknown[];
  claimStructure: string;
  valueKind: string;
  stage: string;
  claimAmount: number;
  awardedAmount?: number | null;
  prepaid: number;
  urgent: boolean;
  feeRelief: string;
  updatedAt: string;
}

export interface Estimate {
  id: string;
  caseId: string;
  version: number;
  status: string;
  result: {
    total: number;
    netPayable: number;
    feeLines: { code: string; labelAr: string; amount: number; treatment: string }[];
    warnings: string[];
    assumptions: string[];
    sources: { id: string; citationAr: string; verified: boolean }[];
    ruleSetId: string;
    ruleSetVersion: string;
    computationTrail: { id: string; titleAr: string; detailAr: string; amount?: number; kind: string }[];
    feeTreatment: string;
    requiresReview: boolean;
    derivedValues: Record<string, unknown>;
  };
  createdAt: string;
}

export interface Dashboard {
  pendingAssessment: number;
  pendingReview: number;
  issued: number;
  collectionIsDemo: boolean;
  recent: Estimate[];
}

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  hash: string;
}
