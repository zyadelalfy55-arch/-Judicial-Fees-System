import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type Estimate } from "../api.ts";
import { formatEgpDisplay } from "@domain/money.ts";
import { Button, Card, StatusBadge } from "../components/ui.tsx";
import { useAuth } from "../context/AuthContext.tsx";

export function ResultPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const [est, setEst] = useState<Estimate | null>(null);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (id) api.estimate(id).then(setEst).catch((e) => setMsg(e.message));
  }, [id]);

  if (!est) return <p>{msg || "جاري التحميل…"}</p>;
  const r = est.result;

  async function act(kind: "submit" | "approve" | "return") {
    if (!id) return;
    try {
      if (kind === "submit") await api.submitReview(id);
      if (kind === "approve") await api.approve(id, reason);
      if (kind === "return") await api.returnCalc(id, reason || "استكمال بيانات");
      setEst(await api.estimate(id));
      setMsg("تم تنفيذ الإجراء على الخادم.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "فشل الإجراء");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <div className="text-xs text-muted">مرجع الحساب {est.id.slice(0, 8)} — إصدار {est.version}</div>
          <h1 className="text-2xl font-bold">المبلغ الإجمالي للرسوم القضائية المستحقة</h1>
        </div>
        <StatusBadge status={est.status} />
      </div>
      <Card className="bg-navy-deep p-8 text-white">
        <div className="text-xs text-gold-light">تقدير تجريبي — ليس أمراً رسمياً</div>
        <div className="mt-2 text-4xl font-bold tabular-nums text-gold-light">{formatEgpDisplay(r.total)}</div>
        <p className="mt-2 text-sm text-slate-300">الصافي بعد المقدم: {formatEgpDisplay(r.netPayable)}</p>
        <p className="mt-2 text-xs">
          القاعدة: {r.ruleSetId} / {r.ruleSetVersion}
        </p>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">بنود الرسم</h2>
          <ul className="space-y-2 text-sm">
            {r.feeLines.map((l) => (
              <li key={l.code} className="flex justify-between">
                <span>{l.labelAr}</span>
                <span className="tabular-nums">{formatEgpDisplay(l.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <StatusBadge status={r.feeTreatment} />
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">مسار الشرح</h2>
          <ol className="space-y-3 text-sm">
            {r.computationTrail.map((s) => (
              <li key={s.id} className="rounded border border-border p-2">
                <div className="font-semibold">{s.titleAr}</div>
                <div className="text-muted">{s.detailAr}</div>
                {s.amount != null ? <div className="tabular-nums">{formatEgpDisplay(s.amount)}</div> : null}
              </li>
            ))}
          </ol>
        </Card>
      </div>
      <Card className="p-5">
        <h2 className="mb-2 font-semibold">المصادر والتحذيرات</h2>
        <ul className="list-disc pr-5 text-sm text-pending">
          {r.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
        {r.sources.map((s) => (
          <p key={s.id} className="mt-2 rounded bg-pending-bg p-3 text-sm">
            {s.citationAr} {s.verified ? "" : "— غير موثّق"}
          </p>
        ))}
      </Card>
      {msg ? <p className="text-sm">{msg}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Link to={`/cases/${est.caseId}`} className="inline-flex">
          <Button variant="secondary">ملف القضية</Button>
        </Link>
        {can("calculation:submit-review") && est.status === "CALCULATED" ? (
          <Button onClick={() => void act("submit")}>إحالة للمراجعة</Button>
        ) : null}
        {can("calculation:approve") && est.status === "PENDING_REVIEW" ? (
          <Button onClick={() => void act("approve")}>اعتماد وإصدار</Button>
        ) : null}
        {can("calculation:return") && est.status === "PENDING_REVIEW" ? (
          <>
            <input className="rounded border border-border px-2" placeholder="سبب الإرجاع" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button variant="danger" onClick={() => void act("return")}>
              إرجاع للتصحيح
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
