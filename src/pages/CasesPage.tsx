import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type CaseRecord } from "../api.ts";
import { Button, Card, StatusBadge, inputClass } from "../components/ui.tsx";
import { COURTS, CASE_TYPES } from "@domain/catalog.ts";

export function CasesPage() {
  const [items, setItems] = useState<CaseRecord[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.cases().then((r) => setItems(r.items)).catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((c) =>
        `${c.caseNumber} ${c.year} ${c.plaintiff} ${c.defendant}`.includes(q),
      ),
    [items, q],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">القضايا / الرول</h1>
        <Link to="/cases/new">
          <Button>إنشاء قضية</Button>
        </Link>
      </div>
      <input className={`${inputClass} max-w-md`} placeholder="بحث برقم القضية أو الخصوم" value={q} onChange={(e) => setQ(e.target.value)} />
      {error ? <p className="text-return">{error}</p> : null}
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-navy text-white">
            <tr>
              <th className="p-3 text-right">الرقم</th>
              <th className="p-3 text-right">النوع</th>
              <th className="p-3 text-right">المحكمة</th>
              <th className="p-3 text-right">الخصوم</th>
              <th className="p-3 text-right">الحالة</th>
              <th className="p-3 text-right">تحديث</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="p-6 text-muted" colSpan={6}>
                  لا توجد قضايا مطابقة.
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => (
                <tr key={c.id} className={i % 2 ? "bg-canvas" : ""}>
                  <td className="p-3">
                    <Link className="font-semibold text-cobalt" to={`/cases/${c.id}`}>
                      {c.caseNumber} / {c.year}
                    </Link>
                  </td>
                  <td className="p-3">{CASE_TYPES.find((t) => t.id === c.caseTypeId)?.nameAr}</td>
                  <td className="p-3">{COURTS.find((t) => t.id === c.courtId)?.nameAr}</td>
                  <td className="p-3">
                    {c.plaintiff} ضد {c.defendant}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="p-3 text-xs text-muted">{new Date(c.updatedAt).toLocaleString("ar-EG")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
