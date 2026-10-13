import { useState, type SyntheticEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calculator, RotateCcw } from "lucide-react";
import { CASE_TYPES, COURTS } from "@domain/catalog.ts";
import { formatEgpDisplay, parseEgpInput } from "@domain/money.ts";
import { ApiError, type PublicCalculationInput, type PublicCalculationResult } from "../api.ts";
import { api } from "../api.ts";
import { Button, Card, Field, inputClass } from "../components/ui.tsx";

const structures = [
  { id: "single", label: "طلب واحد" },
  { id: "same-basis", label: "طلبات على أساس واحد" },
  { id: "different-bases", label: "طلبات على أسس مختلفة" },
  { id: "rent-termination", label: "فسخ إيجار" },
  { id: "unsure", label: "غير متأكد" },
] as const;

const allowedStructures: Record<string, string[]> = {
  civil: ["single", "same-basis", "different-bases", "unsure"],
  commercial: ["single", "same-basis", "different-bases", "unsure"],
  labor: ["single", "unsure"],
  rent: ["rent-termination", "single", "unsure"],
  "multi-claim": ["different-bases", "same-basis", "unsure"],
};

function calculationErrorMessage(cause: unknown): string {
  const code = cause instanceof Error ? cause.message : "";
  const messages: Record<string, string> = {
    EMPTY_AMOUNT: "أدخل قيمة المطالبة.",
    INVALID_DECIMAL: "اكتب المبلغ كرقم وبحد أقصى 3 أرقام عشرية.",
    INVALID_EGP: "قيمة المبلغ غير صالحة.",
    MONEY_NEGATIVE: "لا يمكن إدخال مبلغ سالب.",
    MONEY_NOT_INTEGER: "تعذر تحويل المبلغ إلى قيمة صحيحة.",
    MONEY_OVERFLOW: "المبلغ أكبر من النطاق الرقمي الآمن للحساب. راجع القيمة وأدخل مبلغًا أصغر.",
    INVALID_CALCULATION: "راجع المحكمة ونوع الدعوى وهيكل الطلبات.",
  };
  if (messages[code]) return messages[code];
  if (cause instanceof ApiError) return cause.message;
  return "تعذر حساب الرسوم. راجع البيانات المدخلة وحاول مرة أخرى.";
}

export function PublicCalculatorPage() {
  const [form, setForm] = useState({
    courtId: "cairo-econ",
    caseTypeId: "civil",
    stage: "filing" as PublicCalculationInput["stage"],
    valueKind: "known" as PublicCalculationInput["valueKind"],
    claimStructure: "single" as PublicCalculationInput["claimStructure"],
    claimAmount: "",
    awardedAmount: "",
    urgent: false,
    feeRelief: "standard" as PublicCalculationInput["feeRelief"],
  });
  const [result, setResult] = useState<PublicCalculationResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const claimAmount = parseEgpInput(form.claimAmount);
      const awardedAmount = form.stage === "final" && form.awardedAmount ? parseEgpInput(form.awardedAmount) : undefined;
      const calculated = await api.publicCalculate({
        courtId: form.courtId,
        caseTypeId: form.caseTypeId,
        stage: form.stage,
        valueKind: form.valueKind,
        claimStructure: form.claimStructure,
        claimAmount,
        awardedAmount,
        prepaid: 0,
        urgent: form.urgent,
        feeRelief: form.feeRelief,
      });
      setResult(calculated);
    } catch (cause) {
      setError(calculationErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (result !== null) {
    return (
      <main className="min-h-screen bg-canvas px-4 py-8 sm:py-12">
        <section className="mx-auto max-w-4xl space-y-5">
          <header className="border-b border-border pb-5">
            <p className="text-sm font-semibold text-emerald-800">نتيجة الحساب المبدئي</p>
            <output className="mt-2 block text-4xl font-bold tabular-nums text-navy" aria-label="المبلغ التقديري">{formatEgpDisplay(result.amount)}</output>
            <p className="mt-2 text-sm text-muted">الإجمالي قبل المقدم: {formatEgpDisplay(result.total)} · إصدار القاعدة: {result.ruleSetId} / {result.ruleSetVersion}</p>
          </header>
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">شرح مبسط للحساب</h2>
            <ol className="space-y-3 text-sm">
              {result.computationTrail.map((step, index) => <li key={step.id} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-800">{index + 1}</span>
                <div><div className="font-semibold">{step.titleAr}</div><p className="mt-1 text-muted">{step.detailAr}</p>{step.amount !== undefined ? <p className="mt-1 font-semibold tabular-nums">الناتج: {formatEgpDisplay(step.amount)}</p> : null}</div>
              </li>)}
            </ol>
          </Card>
          <Card className="overflow-hidden">
            <div className="border-b border-border px-4 py-3 font-semibold">تفاصيل الحساب والمراجع</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-navy text-white"><tr><th className="p-3 text-right">الخطوة</th><th className="p-3 text-right">المعادلة / البيان</th><th className="p-3 text-right">الناتج</th></tr></thead>
                <tbody>{result.computationTrail.map((step) => <tr key={step.id} className="border-t border-border align-top">
                  <td className="p-3 font-semibold">{step.titleAr}</td>
                  <td className="max-w-xl p-3"><div>{step.detailAr}</div>{step.formula ? <code className="mt-2 block whitespace-normal rounded bg-canvas p-2 text-xs text-navy" dir="auto">{step.formula}</code> : null}{step.sourceIds?.map((sourceId) => <div key={sourceId} className="mt-2 text-xs text-pending">مرجع القاعدة: {sourceId}</div>)}</td>
                  <td className="p-3 tabular-nums">{step.amount === undefined ? "—" : formatEgpDisplay(step.amount)}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">السند القانوني وحالة المراجعة</h2>
            {result.sources.length ? result.sources.map((source) => <p key={source.id} className="mb-2 rounded bg-pending-bg p-3 text-sm text-pending">{source.citationAr} — {source.verified ? "موثّق" : "غير موثّق؛ لا توجد مادة أو صفحة معتمدة لهذا الحساب"}</p>) : <p className="text-sm text-pending">لم يُرفق سند قانوني معتمد بالقواعد المستخدمة.</p>}
            {result.warnings.map((warning) => <p key={warning} className="mt-2 text-sm text-pending">{warning}</p>)}
            <p className="mt-3 text-sm font-semibold text-return">{result.requiresReview ? "هذه نتيجة تقديرية وتحتاج مراجعة بشرية؛ لا تعتمد عليها كسند أو مطالبة رسمية." : "راجع المرجع قبل الاعتماد."}</p>
          </Card>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => setResult(null)}><RotateCcw size={16} /> حساب جديد</Button>
            <Link to="/login" className="inline-flex items-center gap-2 rounded border border-border-strong bg-white px-4 py-2 text-sm font-semibold text-navy"><ArrowRight size={16} /> رجوع</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-cobalt underline"><ArrowRight size={16} /> رجوع لاختيار نوع المستخدم</Link>
        <header className="mb-6 mt-5 border-b border-border pb-5">
          <p className="text-sm font-semibold text-emerald-800">بوابة المواطن · حساب دون تسجيل</p>
          <h1 className="mt-1 text-2xl font-bold text-navy">تقدير رسوم القضية</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">أدخل بيانات الحساب اللازمة فقط. لا تُدخل أسماء أو أرقامًا قومية؛ لا يتم حفظ مدخلاتك أو نتيجة الحساب.</p>
        </header>
        <form className="space-y-5" onSubmit={submit}>
          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="المحكمة" required>
              <select className={inputClass} value={form.courtId} onChange={(event) => setForm({ ...form, courtId: event.target.value })}>
                {COURTS.map((court) => <option key={court.id} value={court.id}>{court.nameAr}</option>)}
              </select>
            </Field>
            <Field label="نوع القضية" required>
              <select className={inputClass} value={form.caseTypeId} onChange={(event) => {
                const caseTypeId = event.target.value;
                const defaultStructure = CASE_TYPES.find((type) => type.id === caseTypeId)?.defaultStructure ?? "single";
                setForm({ ...form, caseTypeId, claimStructure: defaultStructure as PublicCalculationInput["claimStructure"] });
              }}>
                {CASE_TYPES.map((type) => <option key={type.id} value={type.id}>{type.nameAr}</option>)}
              </select>
            </Field>
            <Field label="مرحلة الدعوى" required>
              <select className={inputClass} value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value as PublicCalculationInput["stage"] })}>
                <option value="filing">رفع / قيد</option>
                <option value="final">مرحلة ختامية</option>
              </select>
            </Field>
            <Field label="هيكل الطلبات" required>
              <select className={inputClass} value={form.claimStructure} onChange={(event) => setForm({ ...form, claimStructure: event.target.value as PublicCalculationInput["claimStructure"] })}>
                {structures.filter((item) => allowedStructures[form.caseTypeId]?.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </Field>
            <Field label="قيمة المطالبة بالجنيه" required hint="يمكن إدخال حتى 3 أرقام عشرية">
              <input className={inputClass} dir="ltr" inputMode="decimal" required value={form.claimAmount} onChange={(event) => setForm({ ...form, claimAmount: event.target.value })} />
            </Field>
            {form.stage === "final" ? <Field label="المبلغ المحكوم به بالجنيه"><input className={inputClass} dir="ltr" inputMode="decimal" value={form.awardedAmount} onChange={(event) => setForm({ ...form, awardedAmount: event.target.value })} /></Field> : null}
            <Field label="طبيعة القيمة">
              <select className={inputClass} value={form.valueKind} onChange={(event) => setForm({ ...form, valueKind: event.target.value as PublicCalculationInput["valueKind"] })}>
                <option value="known">معلومة</option>
                <option value="estimate">تقديرية</option>
                <option value="unknown">غير معلومة</option>
              </select>
            </Field>
            <Field label="معاملة الرسم">
              <select className={inputClass} value={form.feeRelief} onChange={(event) => setForm({ ...form, feeRelief: event.target.value as PublicCalculationInput["feeRelief"] })}>
                <option value="standard">قياسي</option>
                <option value="reduced">مخفّض</option>
                <option value="exempt">إعفاء</option>
                <option value="review">يحتاج مراجعة</option>
              </select>
            </Field>
            <label className="flex min-h-[42px] items-center gap-3 text-sm">
              <input type="checkbox" checked={form.urgent} onChange={(event) => setForm({ ...form, urgent: event.target.checked })} />
              <span>طلب مستعجل</span>
            </label>
          </Card>
          <p className="rounded border border-pending/30 bg-pending-bg p-3 text-sm text-pending">المبلغ تقديري من حزمة غير موثقة قانونيًا، ولا يمثل إيصالًا أو مطالبة رسمية.</p>
          {error ? <p role="alert" className="rounded border border-return/30 bg-return-bg p-3 text-sm text-return">{error}</p> : null}
          <Button className="min-h-12 w-full sm:w-auto" disabled={busy} type="submit"><Calculator size={17} />{busy ? "جاري الحساب…" : "احسب المبلغ"}</Button>
        </form>
      </div>
    </main>
  );
}
