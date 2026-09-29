import { useEffect, useState } from "react";
import { api } from "../api.ts";
import { DEMO_RULE } from "@domain/rule-parameters.ts";
import { Card } from "../components/ui.tsx";
import { formatEgpDisplay } from "@domain/money.ts";

export function RulesPage() {
  const [data, setData] = useState<{ published: typeof DEMO_RULE; changes: Array<{ id: string; status: string }> } | null>(null);
  useEffect(() => {
    api.rules().then((r) => setData(r as never));
  }, []);
  const rule = data?.published ?? DEMO_RULE;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">سجل القواعد القانونية</h1>
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
              <tr key={i} className={i % 2 ? "bg-canvas" : ""}>
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
  const [items, setItems] = useState<Array<{ id: string; at: string; action: string; entity: string; hash: string }>>([]);
  const [chain, setChain] = useState<{ ok: boolean; checked: number } | undefined>();
  useEffect(() => {
    api.audit(q).then((r) => {
      setItems(r.items);
      setChain(r.chain);
    });
  }, [q]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">سجل التدقيق</h1>
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
  const [items, setItems] = useState<Array<{ username: string; displayName: string; titleAr: string; roles: string[] }>>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .users()
      .then((r) => setItems(r.items as never))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">المستخدمون والأدوار</h1>
      {error ? <p className="text-return">{error}</p> : null}
      <div className="grid gap-3">
        {items.map((u) => (
          <div key={u.username} className="rounded border border-border bg-white p-4">
            <div className="font-semibold">{u.displayName}</div>
            <div className="text-sm text-muted">
              {u.username} — {u.titleAr}
            </div>
            <div className="mt-1 text-xs">{u.roles.join("، ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ServicesPage() {
  const [items, setItems] = useState<Array<{ id: string; nameAr: string; baseFee: number }>>([]);
  const [out, setOut] = useState("");
  useEffect(() => {
    api.services().then((r) => setItems(r.items));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">خدمات المحكمة</h1>
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
