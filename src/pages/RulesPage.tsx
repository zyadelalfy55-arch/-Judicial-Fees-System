import { useEffect, useState, type SyntheticEvent } from "react";
import { api } from "../api.ts";
import { DEMO_RULE } from "@domain/rule-parameters.ts";
import { COURTS } from "@domain/catalog.ts";
import { Button, Card, Field, inputClass } from "../components/ui.tsx";
import { formatEgpDisplay } from "@domain/money.ts";
import { useAuth } from "../context/AuthContext.tsx";
import { ROLE_LABELS } from "@domain/rbac.ts";

export function RulesPage() {
  const [data, setData] = useState<{ published: typeof DEMO_RULE; changes: Array<{ id: string; status: string }> } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void api.rules().then((r) => setData(r as never)).catch((cause: Error) => setError(cause.message));
  }, []);
  const rule = data?.published ?? DEMO_RULE;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">سجل القواعد القانونية</h1>
      {error ? <p role="alert" className="text-return">{error}</p> : null}
      <Card className="border-pending p-6">
        <div className="text-sm font-semibold text-pending">مصدر غير موثّق</div>
        <h2 className="mt-1 text-xl font-bold">{rule.nameAr}</h2>
        <p className="text-sm text-muted">
          {rule.ruleSetId} / {rule.version}
        </p>
        <p className="mt-3 text-sm">لا يُعرض هنا نص مادة قانونية مولَّد. الاستبدال يتم بعد إيداع مصدر تشريعي مراجع.</p>
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy text-white">
            <tr>
              <th className="p-3 text-right">حتى</th>
              <th className="p-3 text-right">النسبة (نقطة أساس)</th>
            </tr>
          </thead>
          <tbody>
            {rule.brackets.map((b, i) => (
              <tr key={`${b.upTo ?? "open"}-${b.bps}`} className={i % 2 ? "bg-canvas" : ""}>
                <td className="p-3">{b.upTo == null ? "ما فوق" : formatEgpDisplay(b.upTo)}</td>
                <td className="p-3 tabular-nums">{b.bps}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function AuditPage() {
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [items, setItems] = useState<Array<{ id: string; at: string; action: string; entity: string; hash: string }>>([]);
  const [chain, setChain] = useState<{ ok: boolean; checked: number } | undefined>();
  useEffect(() => {
    void api.audit(q).then((r) => {
      setItems(r.items);
      setChain(r.chain);
      setError("");
    }).catch((cause: Error) => setError(cause.message));
  }, [q]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">سجل التدقيق</h1>
      {error ? <p role="alert" className="text-return">{error}</p> : null}
      {chain ? (
        <p className="text-sm">
          سلسلة التجزئة: {chain.ok ? "سليمة" : "مقطوعة"} — {chain.checked} حدثاً
        </p>
      ) : null}
      <input className="h-[42px] w-full max-w-md rounded border border-border-strong px-3" placeholder="بحث" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="space-y-2">
        {items.map((e) => (
          <div key={e.id} className="rounded border border-border bg-white p-3 text-sm">
            <div className="font-semibold">{e.action}</div>
            <div className="text-muted">
              {e.entity} — {new Date(e.at).toLocaleString("ar-EG")}
            </div>
            <div className="break-all text-[11px] text-slate-400">{e.hash}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminPage() {
  const { user, can } = useAuth();
  const pageSize = 15;
  const [items, setItems] = useState<Array<{ id: string; username: string; displayName: string; titleAr: string; email: string | null; courtId: string | null; roles: string[]; active: boolean }>>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState({ q: "", roleId: "", active: "" });
  const [draftQuery, setDraftQuery] = useState({ q: "", roleId: "", active: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ username: "", displayName: "", email: "", password: "", roleId: "estimator", courtId: "" });
  const allowedRoles = can("security:manage")
    ? ["citizen", "estimator", "supervisor", "legal_reviewer", "project_manager", "leader", "admin", "super_admin", "system_admin"]
    : ["citizen", "estimator", "supervisor", "legal_reviewer", "project_manager", "leader"];
  const staffRoles = new Set(["estimator", "supervisor", "legal_reviewer", "project_manager", "leader"]);

  async function refresh() {
    const result = await api.users({
      q: query.q || undefined,
      roleId: query.roleId || undefined,
      active: query.active ? query.active === "true" : undefined,
      page,
      pageSize,
    });
    setItems(result.items);
    setTotal(result.total);
  }

  useEffect(() => {
    let current = true;
    void api.users({
      q: query.q || undefined,
      roleId: query.roleId || undefined,
      active: query.active ? query.active === "true" : undefined,
      page,
      pageSize,
    }).then((result) => {
      if (!current) return;
      setItems(result.items);
      setTotal(result.total);
      setError("");
    }).catch((cause: Error) => {
      if (current) setError(cause.message);
    });
    return () => { current = false; };
  }, [query, page]);

  async function createUser(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.createUser({ ...form, email: form.email || undefined, courtId: staffRoles.has(form.roleId) ? form.courtId : undefined });
      setForm({ username: "", displayName: "", email: "", password: "", roleId: "estimator", courtId: "" });
      await refresh();
      setNotice("تم إنشاء الحساب بالصلاحيات المحددة.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إنشاء الحساب.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">المستخدمون والأدوار</h1>
      {error ? <p className="text-return">{error}</p> : null}
      {notice ? <output className="block text-sm text-verified">{notice}</output> : null}
      <Card className="p-4">
        <form className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4" onSubmit={(event) => {
          event.preventDefault();
          setQuery(draftQuery);
          setPage(1);
        }}>
          <Field label="بحث عن مستخدم"><input className={inputClass} value={draftQuery.q} onChange={(event) => setDraftQuery({ ...draftQuery, q: event.target.value })} placeholder="الاسم أو اسم المستخدم أو البريد" /></Field>
          <Field label="الدور"><select className={inputClass} value={draftQuery.roleId} onChange={(event) => setDraftQuery({ ...draftQuery, roleId: event.target.value })}>
            <option value="">كل الأدوار</option>{Object.entries(ROLE_LABELS).map(([roleId, label]) => <option key={roleId} value={roleId}>{label}</option>)}
          </select></Field>
          <Field label="حالة الحساب"><select className={inputClass} value={draftQuery.active} onChange={(event) => setDraftQuery({ ...draftQuery, active: event.target.value })}>
            <option value="">كل الحالات</option><option value="true">نشط</option><option value="false">معطل</option>
          </select></Field>
          <div className="flex gap-2"><Button type="submit">بحث</Button><Button type="button" variant="secondary" onClick={() => { const empty = { q: "", roleId: "", active: "" }; setDraftQuery(empty); setQuery(empty); setPage(1); }}>مسح</Button></div>
        </form>
      </Card>
      <Card className="p-5">
        <h2 className="mb-4 font-semibold">إنشاء حساب</h2>
        <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" onSubmit={createUser}>
          <input className="h-[42px] rounded border border-border-strong px-3 text-sm" placeholder="اسم المستخدم" required minLength={3} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input className="h-[42px] rounded border border-border-strong px-3 text-sm" placeholder="الاسم الكامل" required minLength={2} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <input className="h-[42px] rounded border border-border-strong px-3 text-sm" placeholder="البريد الإلكتروني (اختياري)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="h-[42px] rounded border border-border-strong px-3 text-sm" placeholder="كلمة مرور مؤقتة (12 حرفًا على الأقل)" type="password" required minLength={12} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className="h-[42px] rounded border border-border-strong bg-white px-3 text-sm" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value, courtId: staffRoles.has(e.target.value) ? form.courtId : "" })}>
            {allowedRoles.map((roleId) => <option key={roleId} value={roleId}>{ROLE_LABELS[roleId as keyof typeof ROLE_LABELS]}</option>)}
          </select>
          {staffRoles.has(form.roleId) ? <select className="h-[42px] rounded border border-border-strong bg-white px-3 text-sm" value={form.courtId} required aria-label="محكمة الموظف" onChange={(e) => setForm({ ...form, courtId: e.target.value })}>
            <option value="">اختر المحكمة المسندة</option>
            {COURTS.map((court) => <option key={court.id} value={court.id}>{court.nameAr}</option>)}
          </select> : null}
          <Button disabled={busy || (staffRoles.has(form.roleId) && !form.courtId)}>{busy ? "جاري الإنشاء…" : "إنشاء الحساب"}</Button>
        </form>
        <p className="mt-3 text-xs text-muted">إنشاء أو ترقية حساب سوبر أدمن غير متاح للأدمن العادي.</p>
      </Card>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 text-sm">
          <span>عدد النتائج: {total}</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>السابق</Button>
            <span>صفحة {page} من {Math.max(1, Math.ceil(total / pageSize))}</span>
            <Button type="button" variant="secondary" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((current) => current + 1)}>التالي</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy text-white"><tr><th className="p-3 text-right">المستخدم</th><th className="p-3 text-right">الدور</th><th className="p-3 text-right">المحكمة</th><th className="p-3 text-right">الحالة</th><th className="p-3 text-right">الإجراء</th></tr></thead>
            <tbody>{items.map((account, index) => (
              <tr key={account.id} className={index % 2 ? "bg-canvas" : "bg-white"}>
                <td className="p-3"><div className="font-semibold">{account.displayName}</div><div className="text-xs text-muted">{account.username}{account.email ? ` · ${account.email}` : ""}</div></td>
                <td className="p-3">{account.roles.map((role) => ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role).join("، ")}</td>
                <td className="p-3">{can("security:manage") ? <select aria-label={`محكمة ${account.username}`} className="h-9 max-w-56 rounded border border-border-strong bg-white px-2" value={account.courtId ?? ""} onChange={async (event) => {
                  const courtId = event.target.value || null;
                  setError("");
                  try { await api.updateUser(account.id, { courtId }); await refresh(); setNotice("تم تحديث المحكمة المسندة وتسجيل العملية."); } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر تغيير المحكمة."); }
                }}><option value="">غير مسندة</option>{COURTS.map((court) => <option key={court.id} value={court.id}>{court.nameAr}</option>)}</select> : COURTS.find((court) => court.id === account.courtId)?.nameAr ?? "غير مسندة"}</td>
                <td className="p-3">{account.active ? "نشط" : "معطل"}</td>
                <td className="p-3"><div className="flex flex-wrap gap-2">
                  <select aria-label={`الدور الجديد لـ ${account.username}`} className="h-9 rounded border border-border-strong bg-white px-2" value={account.roles[0] ?? ""} onChange={async (event) => {
                    const roleId = event.target.value;
                    if (!roleId || !window.confirm(`تأكيد تغيير دور ${account.username} إلى ${ROLE_LABELS[roleId as keyof typeof ROLE_LABELS]}؟`)) return;
                    setError("");
                    try { await api.updateUser(account.id, { roleId }); await refresh(); setNotice("تم تحديث الدور وتسجيل العملية."); } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر تحديث الدور."); }
                  }}>
                    {allowedRoles.map((roleId) => <option key={roleId} value={roleId}>{ROLE_LABELS[roleId as keyof typeof ROLE_LABELS]}</option>)}
                  </select>
                  <Button variant={account.active ? "danger" : "secondary"} disabled={account.id === user?.id} onClick={async () => {
                    const active = !account.active;
                    if (!window.confirm(`تأكيد ${active ? "إعادة تفعيل" : "تعطيل"} الحساب ${account.username}؟`)) return;
                    setError("");
                    try { await api.updateUser(account.id, { active }); await refresh(); setNotice("تم تحديث حالة الحساب."); } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر تحديث الحساب."); }
                  }}>{account.active ? "تعطيل" : "تفعيل"}</Button>
                </div></td>
              </tr>
            ))}{items.length === 0 ? <tr><td colSpan={5} className="p-4 text-muted">لا توجد حسابات مطابقة.</td></tr> : null}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function ServicesPage() {
  const [items, setItems] = useState<Array<{ id: string; nameAr: string; baseFee: number }>>([]);
  const [out, setOut] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    void api.services().then((r) => setItems(r.items)).catch((cause: Error) => setError(cause.message));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">خدمات المحكمة</h1>
      {error ? <p role="alert" className="text-return">{error}</p> : null}
      <p className="text-sm text-pending">رسوم الخدمات تجريبية وغير موثّقة.</p>
      <div className="grid gap-2 md:grid-cols-2">
        {items.map((s) => (
          <button
            key={s.id}
            className="rounded border border-border bg-white p-4 text-right"
            type="button"
            onClick={async () => {
              const r = await api.calcService(s.id, 1);
              setOut(JSON.stringify(r, null, 2));
            }}
          >
            {s.nameAr}
          </button>
        ))}
      </div>
      {out ? <pre className="overflow-auto rounded bg-navy-deep p-4 text-xs text-white">{out}</pre> : null}
    </div>
  );
}

export function SecurityPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">إدارة النظام والأمن</h1>
      <p className="text-sm">لا تُعرض هنا أدوات بنية تحتية وهمية. الضوابط الفعلية: جلسة HttpOnly، صلاحيات خادمية، رؤوس أمنية، وحد معدل.</p>
      <p className="text-sm text-muted">ITIDA / Gov-PKI: محوّل غير مفعّل. لا يوجد ادعاء تكامل حي.</p>
    </div>
  );
}
