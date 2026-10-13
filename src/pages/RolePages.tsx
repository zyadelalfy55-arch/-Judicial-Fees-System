import { useEffect, useState, type SyntheticEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Activity, ArrowUpRight, BriefcaseBusiness, Calculator, CircleCheck, Users } from "lucide-react";
import { api, type AdminDashboard, type AdminDashboardFilters, type CitizenEstimate, type CitizenProfile, type Catalog } from "../api.ts";
import { Button, Card, Field, inputClass } from "../components/ui.tsx";
import { useAuth } from "../context/AuthContext.tsx";
import { ROLE_LABELS } from "@domain/rbac.ts";
import { formatEgpDisplay } from "@domain/money.ts";

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "مسودة",
    SUBMITTED: "مقدّمة",
    CALCULATING: "قيد الاحتساب",
    CALCULATED: "تم الاحتساب",
    PENDING_REVIEW: "بانتظار المراجعة",
    RETURNED: "معادة",
    APPROVED: "معتمدة",
    ISSUED: "صادرة",
  };
  return labels[status] ?? status;
}

type DistributionItem = { count: number; status?: string; roleId?: string; serviceId?: string; serviceNameAr?: string };

function Distribution({ title, items, labelFor }: Readonly<{
  title: string;
  items: DistributionItem[];
  labelFor: (item: DistributionItem) => string;
}>) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <Card className="p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      {!total ? <p className="text-sm text-muted">لا توجد بيانات مسجلة بعد.</p> : (
        <div className="space-y-3">
          {items.map((item) => {
            const ratio = total ? (item.count / total) * 100 : 0;
            return (
              <div key={labelFor(item)}>
                <div className="mb-1 flex justify-between gap-3 text-sm">
                  <span>{labelFor(item)}</span><span className="tabular-nums text-muted">{item.count} · {ratio.toFixed(1)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-slate-100" role="img" aria-label={`${labelFor(item)} ${ratio.toFixed(1)}%`}>
                  <div className="h-full rounded bg-emerald-700" style={{ width: `${ratio}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-xs text-muted">المقام: {total} سجل ضمن هذا التوزيع.</p>
    </Card>
  );
}

export function AdminDashboardPage() {
  const { can } = useAuth();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [filters, setFilters] = useState<AdminDashboardFilters>({});
  const [draftFilters, setDraftFilters] = useState<AdminDashboardFilters>({});
  const [error, setError] = useState("");

  useEffect(() => {
    api.adminDashboard(filters).then(setData).catch((cause) => setError(cause.message));
  }, [filters]);

  useEffect(() => {
    api.catalog().then(setCatalog).catch((cause) => setError(cause.message));
  }, []);

  if (!can("dashboard:admin")) return <Navigate to="/" replace />;
  if (error) return <div role="alert" className="rounded border border-return bg-return-bg p-4 text-return">تعذر تحميل المؤشرات: {error}</div>;
  if (!data) return <p aria-live="polite">جاري تحميل المؤشرات…</p>;

  const metrics = [
    { label: "المستخدمون النشطون", value: data.users.total, icon: Users },
    { label: "المواطنون", value: data.users.citizens, icon: BriefcaseBusiness },
    { label: "الموظفون", value: data.users.employees, icon: Users },
    { label: "ملفات القضايا", value: data.activity.cases, icon: BriefcaseBusiness },
    { label: "عمليات الحساب", value: data.activity.calculations, icon: Calculator },
    { label: "حسابات الخدمات", value: data.activity.serviceCalculations, icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="text-sm font-semibold text-emerald-800">الإدارة والتحليلات</p>
          <h1 className="mt-1 text-2xl font-bold">لوحة متابعة النظام</h1>
          <p className="mt-1 text-sm text-muted">الأرقام مجمعة من سجلات SQLite المسجلة، وليست بيانات تجريبية ثابتة.</p>
        </div>
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-cobalt underline">إدارة المستخدمين <ArrowUpRight size={16} /></Link>
      </div>
      <Card className="p-4">
        <form className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-6" onSubmit={(event) => {
          event.preventDefault();
          setError("");
          setFilters(draftFilters);
        }}>
          <Field label="من تاريخ"><input className={inputClass} type="date" value={draftFilters.dateFrom ?? ""} max={draftFilters.dateTo} onChange={(event) => setDraftFilters({ ...draftFilters, dateFrom: event.target.value || undefined })} /></Field>
          <Field label="إلى تاريخ"><input className={inputClass} type="date" value={draftFilters.dateTo ?? ""} min={draftFilters.dateFrom} onChange={(event) => setDraftFilters({ ...draftFilters, dateTo: event.target.value || undefined })} /></Field>
          <Field label="حالة القضية"><select className={inputClass} value={draftFilters.status ?? ""} onChange={(event) => setDraftFilters({ ...draftFilters, status: event.target.value || undefined })}>
            <option value="">كل الحالات</option>
            <option value="DRAFT">مسودة</option><option value="SUBMITTED">مقدّمة</option><option value="CALCULATING">قيد الحساب</option><option value="CALCULATED">تم الحساب</option><option value="PENDING_REVIEW">بانتظار المراجعة</option><option value="RETURNED">معادة</option><option value="APPROVED">معتمدة</option><option value="ISSUED">صادرة</option>
          </select></Field>
          <Field label="الخدمة"><select className={inputClass} value={draftFilters.serviceId ?? ""} onChange={(event) => setDraftFilters({ ...draftFilters, serviceId: event.target.value || undefined })}>
            <option value="">كل الخدمات</option>{catalog?.services.map((service) => <option key={service.id} value={service.id}>{service.nameAr}</option>)}
          </select></Field>
          <Field label="الدور"><select className={inputClass} value={draftFilters.roleId ?? ""} onChange={(event) => setDraftFilters({ ...draftFilters, roleId: event.target.value || undefined })}>
            <option value="">كل الأدوار</option>{Object.entries(ROLE_LABELS).map(([roleId, label]) => <option key={roleId} value={roleId}>{label}</option>)}
          </select></Field>
          <div className="flex gap-2">
            <Button type="submit">تطبيق</Button>
            <Button type="button" variant="secondary" onClick={() => { setDraftFilters({}); setFilters({}); }}>مسح</Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-muted">فلاتر التاريخ بحسب تاريخ إنشاء كل سجل. فلتر الدور يقيّد السجلات بمنشئها، وتوزيع المستخدمين يعرض الحسابات النشطة حاليًا.</p>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="flex items-center gap-4 p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded bg-emerald-50 text-emerald-800"><Icon size={20} /></span>
            <div><div className="text-sm text-muted">{label}</div><div className="mt-1 text-2xl font-bold tabular-nums">{value}</div></div>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Distribution title="حالات ملفات القضايا" items={data.casesByStatus} labelFor={(item) => formatStatus(item.status ?? "")} />
        <Distribution title="تعيينات المستخدمين حسب الدور" items={data.usersByRole} labelFor={(item) => ROLE_LABELS[item.roleId as keyof typeof ROLE_LABELS] ?? item.roleId ?? "غير معروف"} />
        <Distribution title="أكثر الخدمات استخدامًا" items={data.servicesByUse} labelFor={(item) => item.serviceNameAr ?? item.serviceId ?? "غير معروف"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm text-muted"><CircleCheck size={16} /> نسبة القضايا الصادرة</div>
          <div className="mt-2 text-3xl font-bold tabular-nums">{data.completion.percentage === null ? "غير متاح" : `${data.completion.percentage.toFixed(1)}%`}</div>
          <p className="mt-2 text-xs text-muted">{data.completion.completed} صادرة من أصل {data.completion.eligible} قضية مسجلة.</p>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted">متوسط حساب رسوم الخدمات</div>
          <div className="mt-2 text-3xl font-bold tabular-nums">{data.serviceEstimateAverage === null ? "غير متاح" : formatEgpDisplay(data.serviceEstimateAverage)}</div>
          <p className="mt-2 text-xs text-muted">محسوب من {data.activity.serviceCalculations} حساب خدمة محفوظ.</p>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted">مصدر البيانات</div>
          <div className="mt-2 font-semibold">القضايا، التقديرات، الخدمات، المستخدمون</div>
          <p className="mt-2 text-xs text-pending">مؤشرات الرسوم والخدمات لا تمثل اعتمادًا قانونيًا.</p>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-3 font-semibold">أحدث عمليات حساب الخدمات</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy text-white"><tr><th className="p-3 text-right">الخدمة</th><th className="p-3 text-right">عدد الصفحات</th><th className="p-3 text-right">القيمة التجريبية</th><th className="p-3 text-right">التاريخ</th></tr></thead>
            <tbody>{data.recentServices.length ? data.recentServices.map((item) => <tr key={item.id} className="border-t border-border"><td className="p-3">{item.serviceId}</td><td className="p-3 tabular-nums">{item.pages}</td><td className="p-3 tabular-nums">{formatEgpDisplay(item.total)}</td><td className="p-3">{new Date(item.createdAt).toLocaleString("ar-EG")}</td></tr>) : <tr><td colSpan={4} className="p-4 text-muted">لا توجد عمليات محفوظة.</td></tr>}</tbody>
          </table>
        </div>
      </Card>
      {data.adminActivity ? (
        <Card className="overflow-hidden">
          <div className="border-b border-border px-4 py-3 font-semibold">أحدث النشاطات الإدارية</div>
          <div className="divide-y divide-border">
            {data.adminActivity.length ? data.adminActivity.map((event) => (
              <div key={event.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <div><span className="font-semibold">{event.action}</span><span className="mr-2 text-muted">{event.entity} · {event.username ?? "حساب غير موجود"}</span></div>
                <time className="text-xs text-muted">{new Date(event.at).toLocaleString("ar-EG")}</time>
              </div>
            )) : <p className="p-4 text-sm text-muted">لا توجد نشاطات إدارية مسجلة.</p>}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", displayName: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) void navigate(user.roles.includes("citizen") ? "/citizen" : "/", { replace: true });
  }, [user, navigate]);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register({ ...form, phone: form.phone || undefined });
      void navigate("/citizen", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إنشاء الحساب.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <Card className="w-full max-w-xl p-6 sm:p-9">
        <p className="text-sm font-semibold text-emerald-800">بوابة المواطن</p>
        <h1 className="mt-1 text-2xl font-bold">إنشاء حساب مواطن</h1>
        <p className="mt-2 text-sm text-muted">الحساب الجديد لا يمنح صلاحيات موظف أو إدارة.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Field label="الاسم الكامل" required><input className={inputClass} autoComplete="name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></Field>
          <Field label="اسم المستخدم" required><input className={inputClass} dir="ltr" autoComplete="username" minLength={3} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
          <Field label="البريد الإلكتروني" required><input className={inputClass} dir="ltr" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="رقم الهاتف"><input className={inputClass} dir="ltr" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="كلمة المرور" required hint="12 حرفًا على الأقل"><input className={inputClass} dir="ltr" type="password" autoComplete="new-password" minLength={12} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          {error ? <p role="alert" className="rounded bg-return-bg p-3 text-sm text-return">{error}</p> : null}
          <Button className="w-full" disabled={busy}>{busy ? "جاري إنشاء الحساب…" : "إنشاء الحساب"}</Button>
          <p className="text-center text-sm text-muted">لديك حساب؟ <Link to="/login" className="font-semibold text-cobalt underline">تسجيل الدخول</Link></p>
        </form>
      </Card>
    </div>
  );
}

export function CitizenDashboardPage() {
  const { user, can } = useAuth();
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [estimates, setEstimates] = useState<CitizenEstimate[]>([]);
  const [pages, setPages] = useState(1);
  const [selectedService, setSelectedService] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.citizenProfile(), api.catalog(), api.citizenDashboard()])
      .then(([current, available, dashboard]) => {
        setProfile(current);
        setCatalog(available);
        setEstimates(dashboard.estimates);
        setSelectedService(available.services[0]?.id ?? "");
      })
      .catch((cause) => setError(cause.message));
  }, []);

  if (!can("citizen:portal")) return <Navigate to="/" replace />;
  if (error) return <div role="alert" className="rounded border border-return bg-return-bg p-4 text-return">تعذر تحميل بوابة المواطن: {error}</div>;
  if (!profile || !catalog) return <p aria-live="polite">جاري تحميل حسابك…</p>;

  async function updateProfile(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      setProfile(await api.updateCitizenProfile({ displayName: profile.displayName, email: profile.email, phone: profile.phone ?? undefined }));
      setNotice("تم تحديث بيانات الملف الشخصي.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحديث البيانات.");
    } finally {
      setBusy(false);
    }
  }

  async function calculateService() {
    if (!selectedService) return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const result = await api.calcService(selectedService, pages) as CitizenEstimate;
      setEstimates((current) => [{ ...result, createdAt: new Date().toISOString() }, ...current]);
      setNotice(`نتيجة الحساب التقديرية: ${formatEgpDisplay(result.total)}. تم حفظها في سجل حساباتك.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حساب الخدمة.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <p className="text-sm font-semibold text-emerald-800">بوابة المواطن</p>
        <h1 className="mt-1 text-2xl font-bold">مرحبًا، {user?.displayName}</h1>
        <p className="mt-1 text-sm text-muted">حساب رسوم خدمات المحكمة وحساباتك المحفوظة.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">حساب خدمة</h2>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px]">
            <Field label="الخدمة" required><select className={inputClass} value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>{catalog.services.map((service) => <option key={service.id} value={service.id}>{service.nameAr}</option>)}</select></Field>
            <Field label="عدد الصفحات" required><input className={inputClass} type="number" min={1} max={10000} value={pages} onChange={(e) => setPages(Math.max(1, Number(e.target.value) || 1))} /></Field>
          </div>
          <Button className="mt-4" disabled={busy || !selectedService} onClick={() => void calculateService()}><Calculator size={16} /> احسب الخدمة</Button>
          <p className="mt-3 text-xs text-pending">الرسوم المعروضة تجريبية وغير موثقة قانونيًا.</p>
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">بيانات الملف الشخصي</h2>
          <form className="space-y-3" onSubmit={updateProfile}>
            <Field label="الاسم الكامل" required><input className={inputClass} value={profile.displayName} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} /></Field>
            <Field label="البريد الإلكتروني" required><input className={inputClass} type="email" dir="ltr" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></Field>
            <Field label="رقم الهاتف"><input className={inputClass} dir="ltr" value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value || null })} /></Field>
            <Button variant="secondary" disabled={busy}>حفظ البيانات</Button>
          </form>
        </Card>
      </div>
      {notice ? <output className="block rounded border border-verified/20 bg-verified-bg p-3 text-sm text-verified">{notice}</output> : null}
      {error ? <p role="alert" className="rounded border border-return/20 bg-return-bg p-3 text-sm text-return">{error}</p> : null}
      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-3 font-semibold">سجل حساباتك ({estimates.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy text-white"><tr><th className="p-3 text-right">الخدمة</th><th className="p-3 text-right">الصفحات</th><th className="p-3 text-right">القيمة</th><th className="p-3 text-right">التاريخ</th></tr></thead>
            <tbody>{estimates.length ? estimates.map((item) => <tr key={item.id} className="border-t border-border"><td className="p-3">{catalog.services.find((service) => service.id === item.serviceId)?.nameAr ?? item.serviceId}</td><td className="p-3 tabular-nums">{item.pages}</td><td className="p-3 tabular-nums">{formatEgpDisplay(item.total)}</td><td className="p-3">{new Date(item.createdAt).toLocaleString("ar-EG")}</td></tr>) : <tr><td colSpan={4} className="p-4 text-muted">لا توجد حسابات محفوظة. ابدأ بحساب خدمة من الأعلى.</td></tr>}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
