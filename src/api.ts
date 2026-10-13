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
  login: (body: { username: string; password: string }) =>
    request<{ user: SessionUser; mode: string }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  publicCalculate: (body: PublicCalculationInput) =>
    request<PublicCalculationResult>("/api/public/calculate", { method: "POST", body: JSON.stringify(body) }),
  register: (body: { username: string; displayName: string; email: string; phone?: string; password: string }) =>
    request<{ user: SessionUser; mode: string }>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  catalog: () => request<Catalog>("/api/catalog"),
  dashboard: () => request<Dashboard>("/api/dashboard"),
  adminDashboard: (filters: AdminDashboardFilters = {}) => {
    const query = new URLSearchParams();
    if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) query.set("dateTo", filters.dateTo);
    if (filters.status) query.set("status", filters.status);
    if (filters.serviceId) query.set("serviceId", filters.serviceId);
    if (filters.roleId) query.set("roleId", filters.roleId);
    const suffix = query.toString();
    return request<AdminDashboard>(suffix ? `/api/admin/dashboard?${suffix}` : "/api/admin/dashboard");
  },
  citizenDashboard: () => request<{ estimates: CitizenEstimate[] }>("/api/citizen/dashboard"),
  citizenProfile: () => request<CitizenProfile>("/api/citizen/profile"),
  updateCitizenProfile: (body: { displayName: string; email: string; phone?: string }) =>
    request<CitizenProfile>("/api/citizen/profile", { method: "PATCH", body: JSON.stringify(body) }),
  cases: () => request<{ items: CaseRecord[] }>("/api/cases"),
  case: (id: string) => request<CaseRecord>(`/api/cases/${id}`),
  createCase: (body: unknown) => request<CaseRecord>("/api/cases", { method: "POST", body: JSON.stringify(body) }),
  patchCase: (id: string, body: unknown) => request<CaseRecord>(`/api/cases/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  calculate: (caseId: string) => request<Estimate>(`/api/cases/${caseId}/calculate`, { method: "POST" }),
  estimate: (id: string) => request<Estimate>(`/api/calculations/${id}`),
  estimates: (caseId?: string) => {
    const query = new URLSearchParams();
    if (caseId) query.set("caseId", caseId);
    const suffix = query.toString();
    return request<{ items: Estimate[] }>(suffix ? `/api/calculations?${suffix}` : "/api/calculations");
  },
  submitReview: (id: string) => request(`/api/calculations/${id}/submit-review`, { method: "POST" }),
  approve: (id: string, reason?: string) =>
    request(`/api/calculations/${id}/approve`, { method: "POST", body: JSON.stringify({ reason }) }),
  returnCalc: (id: string, reason: string) =>
    request(`/api/calculations/${id}/return`, { method: "POST", body: JSON.stringify({ reason }) }),
  reviewQueue: () => request<{ items: Estimate[] }>("/api/review-queue"),
  rules: () => request<{ published: unknown; changes: unknown[] }>("/api/rules"),
  audit: (q?: string) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    const suffix = query.toString();
    return request<{ items: AuditEvent[]; chain?: { ok: boolean; checked: number } }>(suffix ? `/api/audit?${suffix}` : "/api/audit");
  },
  users: (filters: { q?: string; roleId?: string; active?: boolean; page?: number; pageSize?: number } = {}) => {
    const query = new URLSearchParams();
    if (filters.q) query.set("q", filters.q);
    if (filters.roleId) query.set("roleId", filters.roleId);
    if (filters.active !== undefined) query.set("active", String(filters.active));
    if (filters.page) query.set("page", String(filters.page));
    if (filters.pageSize) query.set("pageSize", String(filters.pageSize));
    const suffix = query.toString();
    return request<{ items: ManagedUser[]; total: number; page: number; pageSize: number }>(suffix ? `/api/users?${suffix}` : "/api/users");
  },
  createUser: (body: { username: string; displayName: string; email?: string; phone?: string; password: string; roleId: string; courtId?: string }) =>
    request<ManagedUser>("/api/users", { method: "POST", body: JSON.stringify(body) }),
  updateUser: (id: string, body: { active?: boolean; roleId?: string; courtId?: string | null }) =>
    request<ManagedUser>(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
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

export interface PublicCalculationInput {
  courtId: string;
  caseTypeId: string;
  stage: "filing" | "final";
  valueKind: "known" | "unknown" | "estimate";
  claimStructure: "single" | "same-basis" | "different-bases" | "rent-termination" | "unsure";
  claimAmount: number;
  awardedAmount?: number;
  prepaid: number;
  urgent: boolean;
  feeRelief: "standard" | "reduced" | "exempt" | "review";
}

export interface PublicCalculationResult {
  amount: number;
  total: number;
  feeLines: Array<{ code: string; labelAr: string; amount: number; treatment: string }>;
  computationTrail: Array<{ id: string; titleAr: string; detailAr: string; amount?: number; kind: string; formula?: string; sourceIds?: string[] }>;
  sources: Array<{ id: string; citationAr: string; verified: boolean }>;
  warnings: string[];
  assumptions: string[];
  requiresReview: boolean;
  ruleSetId: string;
  ruleSetVersion: string;
}

export interface CitizenProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  phone: string | null;
  titleAr: string;
}

export interface CitizenEstimate {
  id: string;
  serviceId: string;
  pages: number;
  total: number;
  createdAt: string;
}

export interface ManagedUser extends SessionUser {
  email: string | null;
  phone: string | null;
  active: boolean;
}

export interface AdminDashboard {
  users: { total: number; citizens: number; employees: number };
  activity: { cases: number; calculations: number; serviceCalculations: number };
  casesByStatus: Array<{ status: string; count: number }>;
  servicesByUse: Array<{ serviceId: string; serviceNameAr: string; count: number }>;
  usersByRole: Array<{ roleId: string; count: number }>;
  completion: { completed: number; eligible: number; percentage: number | null };
  serviceEstimateAverage: number | null;
  recentEstimates: Estimate[];
  recentServices: CitizenEstimate[];
  adminActivity?: Array<{ id: string; at: string; actorId: string | null; username: string | null; action: string; entity: string; entityId: string | null }>;
}

export interface AdminDashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  serviceId?: string;
  roleId?: string;
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
    computationTrail: { id: string; titleAr: string; detailAr: string; amount?: number; kind: string; formula?: string; sourceIds?: string[] }[];
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
