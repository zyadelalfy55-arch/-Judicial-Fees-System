import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.ts";
import { useAuth } from "../context/AuthContext.tsx";
import { Button, Field, inputClass } from "../components/ui.tsx";
import { COURTS } from "@domain/catalog.ts";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("estimator");
  const [password, setPassword] = useState("demo-estimator");
  const [courtId, setCourtId] = useState("cairo-econ");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-xl lg:grid-cols-12">
        <div className="relative flex flex-col justify-between bg-navy-deep p-10 text-white lg:col-span-5">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <img src="/logo.jpg" alt="" className="h-14 w-14 rounded-full bg-white object-contain p-1" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-light">جمهورية مصر العربية</p>
                <h1 className="text-lg font-semibold">وزارة العدل</h1>
              </div>
            </div>
            <h2 className="mb-3 text-2xl font-bold leading-9">بوابة الدخول لمنظومة حساب الرسوم القضائية</h2>
            <p className="text-sm leading-7 text-slate-300">
              منصة مرجعية لتسجيل الدعاوى، اشتقاق الوعاء المالي، واحتساب الرسوم مع مسار شرح وتدقيق. ليست خدمة حكومية حية.
            </p>
          </div>
          <div className="rounded-lg bg-white/5 p-4 text-sm text-slate-300">جلسة مشفّرة عبر ملف تعريف ارتباط HttpOnly. وضع التشغيل الحالي: تجريبي.</div>
        </div>
        <form
          className="space-y-4 p-10 lg:col-span-7"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await login(username, password, courtId);
              navigate("/");
            } catch (err) {
              setError(err instanceof Error ? err.message : "تعذر الدخول");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-verified">وضع التجربة المحلي</span>
            <button type="button" className="text-muted" onClick={() => void api.health().then(() => undefined)}>
              AUTH-02
            </button>
          </div>
          <h3 className="text-xl font-semibold text-navy">تسجيل الدخول المؤسسي</h3>
          <Field label="المحكمة أو الجهة القضائية" required>
            <select className={inputClass} value={courtId} onChange={(e) => setCourtId(e.target.value)}>
              {COURTS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </select>
          </Field>
          <Field label="المعرّف الوظيفي (تجريبي)" required hint="مثال: estimator">
            <input className={inputClass} dir="ltr" value={username} onChange={(e) => setUsername(e.target.value)} />
          </Field>
          <Field label="كلمة المرور" required>
            <div className="relative">
              <input
                className={`${inputClass} pl-12`}
                dir="ltr"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="absolute left-2 top-2 text-xs text-muted" onClick={() => setShow((s) => !s)}>
                {show ? "إخفاء" : "إظهار"}
              </button>
            </div>
          </Field>
          <p className="text-xs text-muted">الصفة تُستمد من الخادم ولا تُؤخذ من المتصفح. الحسابات التجريبية موثّقة في README.</p>
          {error ? <div className="rounded bg-return-bg p-2 text-sm text-return">{error}</div> : null}
          <Button className="h-12 w-full" disabled={busy} type="submit">
            {busy ? "جاري التحقق…" : "تسجيل الدخول للنظام"}
          </Button>
        </form>
      </div>
    </div>
  );
}
