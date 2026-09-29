import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Estimate } from "../api.ts";
import { formatEgpDisplay } from "@domain/money.ts";
import { Card, StatusBadge } from "../components/ui.tsx";

export function HistoryPage() {
  const [items, setItems] = useState<Estimate[]>([]);
  useEffect(() => {
    api.estimates().then((r) => setItems(r.items));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">سجل التقديرات</h1>
      <p className="text-sm text-muted">اللقطات التاريخية ثابتة ولا تُعاد حسابها صامتة عند تغيير القواعد.</p>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy text-white">
            <tr>
              <th className="p-3 text-right">المرجع</th>
              <th className="p-3 text-right">الإصدار</th>
              <th className="p-3 text-right">الإجمالي</th>
              <th className="p-3 text-right">القاعدة</th>
              <th className="p-3 text-right">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e, i) => (
              <tr key={e.id} className={i % 2 ? "bg-canvas" : ""}>
                <td className="p-3">
                  <Link className="text-cobalt underline" to={`/calculations/${e.id}`}>
                    {e.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="p-3">{e.version}</td>
                <td className="p-3 tabular-nums">{formatEgpDisplay(e.result.total)}</td>
                <td className="p-3 text-xs">
                  {e.result.ruleSetId} {e.result.ruleSetVersion}
                </td>
                <td className="p-3">
                  <StatusBadge status={e.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function ReviewPage() {
  const [items, setItems] = useState<Estimate[]>([]);
  useEffect(() => {
    api.reviewQueue().then((r) => setItems(r.items));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">قائمة المراجعة</h1>
      {items.length === 0 ? <p className="text-muted">لا توجد بنود بانتظار المراجعة.</p> : null}
      <div className="grid gap-3">
        {items.map((e) => (
          <Card key={e.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-semibold">{e.id.slice(0, 8)}</div>
              <div className="text-sm tabular-nums">{formatEgpDisplay(e.result.total)}</div>
            </div>
            <Link className="text-cobalt underline" to={`/calculations/${e.id}`}>
              بدء المراجعة
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
