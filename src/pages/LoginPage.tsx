import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.ts";
import { useAuth } from "../context/AuthContext.tsx";
import { Button, Field, inputClass } from "../components/ui.tsx";

type LoginAudience = "employee" | "admin" | "super_admin" | "citizen";

function roleMatchesAudience(roles: string[], audience: LoginAudience): boolean {
  switch (audience) {
    case "employee":
      return roles.some((role) => ["estimator", "supervisor", "legal_reviewer", "project_manager", "leader"].includes(role));
    case "admin":
      return roles.some((role) => ["admin", "system_admin"].includes(role));
    case "super_admin":
      return roles.includes("super_admin");
    case "citizen":
      return roles.includes("citizen");
  }
}

export function LoginPage() {
  const { user, login, logout, acceptLogin } = useAuth();
  const navigate = useNavigate();
  const [audience, setAudience] = useState<LoginAudience>("employee");
  const [citizenAccountLogin, setCitizenAccountLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  let submitLabel = "تسجيل الدخول للنظام";
  if (audience === "citizen") submitLabel = "ابدأ كمواطن";
  if (audience === "citizen" && citizenAccountLogin) submitLabel = "تسجيل الدخول";
  if (busy) submitLabel = "جاري التحقق…";

  useEffect(() => {
    if (user) void navigate("/", { replace: true });
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
            if (audience === "citizen" && !citizenAccountLogin) {
              void navigate("/public/calculator");
              return;
            }
            setBusy(true);
            setError("");
            try {
              const authenticated = await login(username, password);
              if (!roleMatchesAudience(authenticated.roles, audience)) {
                await logout();
                throw new Error("نوع الحساب لا يطابق الاختيار. اختر النوع الصحيح أو تواصل مع مسؤول النظام.");
              }
              acceptLogin(authenticated);
              void navigate("/");
            } catch (err) {
              setError(err instanceof Error ? err.message : "تعذر الدخول");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-verified">دخول موحد</span>
            <button type="button" className="text-muted" onClick={() => void api.health().then(() => undefined)}>
              AUTH-02
            </button>
          </div>
          <h3 className="text-xl font-semibold text-navy">الدخول إلى المنظومة</h3>
          <Field label="نوع المستخدم" required>
            <select className={inputClass} value={audience} onChange={(e) => {
              setAudience(e.target.value as LoginAudience);
              setCitizenAccountLogin(false);
            }}>
              <option value="employee">موظف</option>
              <option value="admin">أدمن</option>
              <option value="super_admin">سوبر أدمن</option>
              <option value="citizen">مواطن (دخول بدون حساب)</option>
            </select>
          </Field>
          {audience !== "citizen" || citizenAccountLogin ? <>
            <Field label="اسم المستخدم" required>
              <input className={inputClass} dir="ltr" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </Field>
            <Field label="كلمة المرور" required>
              <div className="relative">
                <input
                  className={`${inputClass} pl-12`}
                  dir="ltr"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" className="absolute left-2 top-2 text-xs text-muted" onClick={() => setShow((s) => !s)}>
                  {show ? "إخفاء" : "إظهار"}
                </button>
              </div>
            </Field>
            <p className="text-xs text-muted">اختيار النوع لا يمنح صلاحية؛ الخادم يتحقق من الدور المسجل للحساب.</p>
          </> : <div className="space-y-2 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <p>تقدر تبدأ حساب الرسوم مباشرة دون اسم مستخدم أو كلمة مرور. لن يتم حفظ بيانات القضية.</p>
            <button type="button" className="font-semibold underline" onClick={() => setCitizenAccountLogin(true)}>لدي حساب مواطن مسجل</button>
          </div>}
          {audience === "citizen" && citizenAccountLogin ? <button type="button" className="text-sm font-semibold text-cobalt underline" onClick={() => setCitizenAccountLogin(false)}>استخدم الحاسبة بدون حساب</button> : null}
          {error ? <div className="rounded bg-return-bg p-2 text-sm text-return">{error}</div> : null}
          <Button className="h-12 w-full" disabled={busy} type="submit">
            {submitLabel}
          </Button>
          <p className="text-center text-sm text-muted">مواطن جديد؟ <Link className="font-semibold text-cobalt underline" to="/register">إنشاء حساب مواطن</Link></p>
        </form>
      </div>
    </div>
  );
}
