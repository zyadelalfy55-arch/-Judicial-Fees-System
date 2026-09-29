import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  FilePlus,
  History,
  ScanSearch,
  Scale,
  ScrollText,
  Shield,
  Users,
  Landmark,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.tsx";

const links = [
  { to: "/", label: "لوحة العمل", icon: LayoutDashboard, perm: "dashboard:view" as const },
  { to: "/cases", label: "القضايا", icon: FolderOpen, perm: "case:view" as const },
  { to: "/cases/new", label: "إنشاء قضية جديدة", icon: FilePlus, perm: "case:create" as const },
  { to: "/history", label: "سجل التقديرات", icon: History, perm: "calculation:view" as const },
  { to: "/review", label: "قوائم المراجعة", icon: ScanSearch, perm: "calculation:view" as const },
  { to: "/rules", label: "القواعد القانونية المرجعية", icon: Scale, perm: "rule:view" as const },
  { to: "/services", label: "خدمات المحكمة", icon: Landmark, perm: "services:calculate" as const },
  { to: "/audit", label: "سجل التدقيق", icon: ScrollText, perm: "audit:view" as const },
  { to: "/admin", label: "المستخدمون والصلاحيات", icon: Users, perm: "users:manage" as const },
  { to: "/security", label: "إدارة النظام", icon: Shield, perm: "security:manage" as const },
];

export function AppShell() {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      <button
        className="fixed top-3 right-3 z-50 rounded bg-navy-deep p-2 text-white lg:hidden"
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-label="القائمة"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
      <aside
        className={`fixed inset-y-0 right-0 z-40 flex w-72 flex-col justify-between bg-navy-deep text-white transition-transform ${open ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}
      >
        <div>
          <div className="flex h-16 items-center gap-2 px-4">
            <img src="/logo.jpg" alt="" className="h-9 w-9 rounded-full bg-white object-contain p-0.5" />
            <div>
              <div className="text-sm font-semibold">وزارة العدل</div>
              <div className="text-[11px] font-semibold tracking-wide text-gold-light">جمهورية مصر العربية</div>
            </div>
          </div>
          <div className="flex items-center gap-1 px-4 py-2 text-gold-light">
            <Scale size={14} />
            <span className="text-[11px] font-semibold">نظام تقدير الرسوم القضائية</span>
          </div>
          <nav className="mt-3 flex flex-col gap-1 px-2">
            {links
              .filter((l) => can(l.perm) || l.perm === "dashboard:view")
              .filter((l) => (l.perm === "users:manage" || l.perm === "security:manage" ? can(l.perm) : true))
              .map((l) => {
                const Icon = l.icon;
                return (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.to === "/"}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${isActive ? "bg-white/15 font-bold text-gold-light" : "text-slate-300 hover:bg-white/10 hover:text-white"}`
                    }
                  >
                    <Icon size={18} />
                    {l.label}
                  </NavLink>
                );
              })}
          </nav>
        </div>
        <div className="p-4">
          <div className="mb-3 rounded-lg bg-white/10 p-3">
            <div className="mb-1 text-[11px] font-semibold text-gold-light">النظام القانوني المطبق</div>
            <p className="text-xs leading-5 text-slate-300">حزمة قواعد تجريبية غير موثّقة — ليست نصاً قانونياً.</p>
          </div>
          <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-verified" />
              جلسة عمل آمنة (وضع تجريبي)
            </span>
            <span>v0.1</span>
          </div>
        </div>
      </aside>
      <div className="lg:pr-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white/90 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="" className="hidden h-8 w-8 rounded-full object-contain sm:block" />
            <div>
              <div className="text-sm font-semibold">منظومة حساب الرسوم القضائية</div>
              <div className="text-[11px] text-muted">منصة دعم القرار — نسخة مرجعية غير رسمية</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-left sm:block">
              <div className="text-xs font-semibold">{user?.displayName}</div>
              <div className="text-[11px] text-muted">{user?.titleAr}</div>
            </div>
            <button
              type="button"
              className="rounded p-2 text-muted hover:bg-canvas"
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
              aria-label="خروج"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-[1600px] px-4 py-6 lg:px-8">
          <div className="mb-4 rounded border border-pending/30 bg-pending-bg px-3 py-2 text-xs text-pending">
            وضع تجريبي: الشعار للتعريف البصري فقط. لا يوجد اتصال حكومي حي، والقواعد المالية غير معتمدة قانوناً حتى توفير مصدر موثّق.
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
