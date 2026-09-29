import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type CaseRecord, type Estimate } from "../api.ts";
import { parseEgpInput, formatEgpDisplay } from "@domain/money.ts";
import { Button, Card, Field, StatusBadge, inputClass } from "../components/ui.tsx";
import { useAuth } from "../context/AuthContext.tsx";

export function CaseWorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [c, setC] = useState<CaseRecord | null>(null);
  const [history, setHistory] = useState<Estimate[]>([]);
  const [claimEgp, setClaimEgp] = useState("");
  const [prepaidEgp, setPrepaidEgp] = useState("0");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"facts" | "claim" | "class" | "file">("facts");

  function parseAmount(raw: string, label: string): number | null {
    try {
      return parseEgpInput(raw || "0");
    } catch (e) {
      const code = e instanceof Error ? e.message : "INVALID_DECIMAL";
      let message = `${label}: قيمة غير صالحة.`;
      if (code === "INVALID_DECIMAL") message = `${label}: أدخل رقماً صحيحاً حتى ثلاثة أرقام عشرية.`;
      if (code === "MONEY_NEGATIVE") message = `${label}: لا يمكن إدخال قيمة سالبة.`;
      setError(message);
      return null;
    }
  }

  async function reload() {
    if (!id) return;
    const [item, est] = await Promise.all([api.case(id), api.estimates(id)]);
    setC(item);
    setHistory(est.items);
    setClaimEgp(item.claimAmount ? String(item.claimAmount / 1000) : "");
    setPrepaidEgp(String((item.prepaid ?? 0) / 1000));
  }

  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, [id]);

  if (!c) return <p>{error || "جاري التحميل…"}</p>;

  async function savePatch(body: unknown) {
    if (!id) return;
    setBusy(true);
    try {
      setC(await api.patchCase(id, body));
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted">ملف الدعوى</div>
          <h1 className="text-2xl font-bold">
            {c.caseNumber} لسنة {c.year}
          </h1>
          <p className="text-sm text-muted">
            {c.plaintiff} ضد {c.defendant}
          </p>
        </div>
        <StatusBadge status={c.status} />
      </div>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["facts", "الوقائع"],
            ["claim", "وعاء المطالبة"],
            ["class", "التكييف"],
            ["file", "السجل"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`rounded px-3 py-1 text-sm ${tab === k ? "bg-navy text-white" : "bg-white border border-border"}`}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "facts" ? (
        <Card className="grid gap-4 p-6 md:grid-cols-2">
          <Field label="تاريخ الالتزام / العقد">
            <input
              className={inputClass}
              type="date"
              defaultValue={typeof c.facts.obligationDate === "string" ? c.facts.obligationDate : ""}
              onBlur={(e) => void savePatch({ facts: { ...c.facts, obligationDate: e.target.value } })}
            />
          </Field>
          <Field label="ملاحظات جغرافية / إعلان">
            <input
              className={inputClass}
              defaultValue={typeof c.facts.geographicNotes === "string" ? c.facts.geographicNotes : ""}
              onBlur={(e) => void savePatch({ facts: { ...c.facts, geographicNotes: e.target.value } })}
            />
          </Field>
          <Field label="ملاحظات الوقائع">
            <textarea
              className={`${inputClass} h-24 py-2`}
              defaultValue={typeof c.facts.notes === "string" ? c.facts.notes : ""}
              onBlur={(e) => void savePatch({ facts: { ...c.facts, notes: e.target.value } })}
            />
          </Field>
        </Card>
      ) : null}

      {tab === "claim" ? (
        <Card className="grid gap-4 p-6 md:grid-cols-2">
          <Field label="قيمة المطالبة (جنيه)" required hint="تُحوَّل إلى مليم على الخادم">
            <input className={inputClass} dir="ltr" value={claimEgp} onChange={(e) => setClaimEgp(e.target.value)} />
          </Field>
          <Field label="مبالغ مسددة مقدماً">
            <input className={inputClass} dir="ltr" value={prepaidEgp} onChange={(e) => setPrepaidEgp(e.target.value)} />
          </Field>
          <Field label="طبيعة القيمة">
            <select className={inputClass} value={c.valueKind} onChange={(e) => void savePatch({ valueKind: e.target.value })}>
              <option value="known">معلومة</option>
              <option value="unknown">غير معلومة</option>
              <option value="estimate">تقديرية</option>
            </select>
          </Field>
          <Field label="هيكل الطلبات">
            <select className={inputClass} value={c.claimStructure} onChange={(e) => void savePatch({ claimStructure: e.target.value })}>
              <option value="single">طلب واحد</option>
              <option value="same-basis">طلبات على أساس واحد</option>
              <option value="different-bases">أسس مختلفة</option>
              <option value="rent-termination">فسخ إيجار</option>
              <option value="unsure">غير متأكد</option>
            </select>
          </Field>
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              const claimAmount = parseAmount(claimEgp, "قيمة المطالبة");
              const prepaid = parseAmount(prepaidEgp, "المبالغ المسددة مقدماً");
              if (claimAmount == null || prepaid == null) return;
              void savePatch({ claimAmount, prepaid });
            }}
          >
            حفظ الوعاء
          </Button>
        </Card>
      ) : null}

      {tab === "class" ? (
        <Card className="grid gap-4 p-6 md:grid-cols-2">
          <Field label="المرحلة">
            <select className={inputClass} value={c.stage} onChange={(e) => void savePatch({ stage: e.target.value })}>
              <option value="filing">رفع / قيد</option>
              <option value="final">ختامي</option>
            </select>
          </Field>
          <Field label="معاملة الرسم">
            <select className={inputClass} value={c.feeRelief} onChange={(e) => void savePatch({ feeRelief: e.target.value })}>
              <option value="standard">قياسي</option>
              <option value="reduced">مخفّض</option>
              <option value="exempt">معفى</option>
              <option value="review">يحتاج مراجعة</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={c.urgent}
              onChange={(e) => void savePatch({ urgent: e.target.checked })}
            />
            {" "}استعجال
          </label>
        </Card>
      ) : null}

      {tab === "file" ? (
        <Card className="p-6">
          <h2 className="mb-3 font-semibold">سجل التقديرات</h2>
          <ul className="space-y-2 text-sm">
            {history.map((h) => (
              <li key={h.id}>
                <Link className="text-cobalt underline" to={`/calculations/${h.id}`}>
                  الإصدار {h.version} — {formatEgpDisplay(h.result.total)} — {h.status}
                </Link>
              </li>
            ))}
            {history.length === 0 ? <li className="text-muted">لا تقديرات بعد.</li> : null}
          </ul>
        </Card>
      ) : null}

      {error ? <p className="text-return">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {can("calculation:create") ? (
          <Button
            disabled={busy}
            onClick={async () => {
              if (!id) return;
              const claimAmount = parseAmount(claimEgp, "قيمة المطالبة");
              const prepaid = parseAmount(prepaidEgp, "المبالغ المسددة مقدماً");
              if (claimAmount == null || prepaid == null) return;
              setBusy(true);
              try {
                await savePatch({ claimAmount, prepaid });
                const est = await api.calculate(id);
                navigate(`/calculations/${est.id}`);
              } catch (e) {
                setError(e instanceof Error ? e.message : "تعذر الحساب");
              } finally {
                setBusy(false);
              }
            }}
          >
            تشغيل محرك الحساب
          </Button>
        ) : null}
      </div>
    </div>
  );
}
