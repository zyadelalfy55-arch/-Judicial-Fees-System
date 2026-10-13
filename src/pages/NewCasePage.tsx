import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.ts";
import { CASE_TYPES, COURTS } from "@domain/catalog.ts";
import { Button, Card, Field, inputClass } from "../components/ui.tsx";
import { useAuth } from "../context/AuthContext.tsx";

export function NewCasePage() {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const assignedCourtId = user?.courtId ?? "";
  const availableCourts = can("security:manage") ? COURTS : COURTS.filter((court) => court.id === assignedCourtId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    caseNumber: "",
    year: new Date().getFullYear(),
    courtId: assignedCourtId || COURTS[0].id,
    caseTypeId: CASE_TYPES[0].id,
    courtLevel: COURTS[0].level,
    plaintiff: "",
    defendant: "",
    representative: "",
  });

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const created = await api.createCase({
            ...form,
            year: Number(form.year),
            representative: form.representative || undefined,
          });
          void navigate(`/cases/${created.id}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "تعذر الإنشاء");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1 className="text-2xl font-bold">قيد قضية جديدة</h1>
      <Card className="grid gap-4 p-6 md:grid-cols-2">
        <Field label="رقم الدعوى" required>
          <input className={inputClass} value={form.caseNumber} onChange={(e) => setForm({ ...form, caseNumber: e.target.value })} />
        </Field>
        <Field label="السنة" required>
          <input className={inputClass} type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
        </Field>
        <Field label="المحكمة" required>
          <select
            className={inputClass}
            value={form.courtId}
            onChange={(e) => {
              const court = COURTS.find((c) => c.id === e.target.value)!;
              setForm({ ...form, courtId: court.id, courtLevel: court.level });
            }}
          >
            {availableCourts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameAr}
              </option>
            ))}
          </select>
        </Field>
        <Field label="نوع الدعوى" required>
          <select className={inputClass} value={form.caseTypeId} onChange={(e) => setForm({ ...form, caseTypeId: e.target.value })}>
            {CASE_TYPES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameAr}
              </option>
            ))}
          </select>
        </Field>
        <Field label="المدعي" required>
          <input className={inputClass} value={form.plaintiff} onChange={(e) => setForm({ ...form, plaintiff: e.target.value })} />
        </Field>
        <Field label="المدعى عليه" required>
          <input className={inputClass} value={form.defendant} onChange={(e) => setForm({ ...form, defendant: e.target.value })} />
        </Field>
        <Field label="وكيل المدعي">
          <input className={inputClass} value={form.representative} onChange={(e) => setForm({ ...form, representative: e.target.value })} />
        </Field>
      </Card>
      {!can("security:manage") && !assignedCourtId ? <p role="alert" className="text-return">الحساب غير مرتبط بمحكمة؛ لا يمكن إنشاء قضية قبل إسناد محكمة له.</p> : null}
      {error ? <p className="text-return">{error}</p> : null}
      <Button disabled={busy} type="submit">
        حفظ ومتابعة الوقائع
      </Button>
    </form>
  );
}
