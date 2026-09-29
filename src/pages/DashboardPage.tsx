import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Dashboard } from "../api.ts";
import { Button, Card, StatusBadge } from "../components/ui.tsx";
import { formatEgpDisplay } from "@domain/money.ts";

export function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-return">{error}</p>;
  if (!data) return <p>جاري التحميل…</p>;

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden bg-navy-deep p-8 text-white">
        <h1 className="mb-2 text-3xl font-bold">مرحباً بك في منظومة تقدير الرسوم القضائية</h1>
        <p className="max-w-2xl text-sm text-slate-300">منصة الاحتساب والتدقيق وفق مسار عمل القضية — الحساب يتم على الخادم فقط.</p>
        <Link to="/cases/new" className="mt-6 inline-block">
          <Button variant="gold">إنشاء ملف حساب رسوم جديد</Button>
        </Link>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="text-sm text-muted">قضايا بانتظار التقدير</div>
          <div className="font-[family-name:var(--font-sans)] text-3xl font-bold tabular-nums">{data.pendingAssessment}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted">حسابات بانتظار الاعتماد</div>
          <div className="text-3xl font-bold tabular-nums">{data.pendingReview}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted">أوامر صادرة</div>
          <div className="text-3xl font-bold tabular-nums">{data.issued}</div>
          {data.collectionIsDemo ? <p className="mt-2 text-xs text-pending">مؤشرات التحصيل غير مربوطة بمصدر حي (بيانات تشغيلية تجريبية).</p> : null}
        </Card>
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-3 font-semibold">آخر التقديرات</div>
        <table className="w-full text-sm">
          <thead className="bg-navy text-white">
            <tr>
              <th className="p-3 text-right">المرجع</th>
              <th className="p-3 text-right">الإجمالي</th>
              <th className="p-3 text-right">الحالة</th>
              <th className="p-3 text-right">القاعدة</th>
            </tr>
          </thead>
          <tbody>
            {data.recent.length === 0 ? (
              <tr>
                <td className="p-4 text-muted" colSpan={4}>
                  لا توجد تقديرات بعد.
                </td>
              </tr>
            ) : (
              data.recent.map((e, i) => (
                <tr key={e.id} className={i % 2 ? "bg-canvas" : "bg-white"}>
                  <td className="p-3">
                    <Link className="text-cobalt underline" to={`/calculations/${e.id}`}>
                      {e.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="p-3 tabular-nums">{formatEgpDisplay(e.result.total)}</td>
                  <td className="p-3">
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="p-3 text-xs">
                    {e.result.ruleSetId} / {e.result.ruleSetVersion}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
