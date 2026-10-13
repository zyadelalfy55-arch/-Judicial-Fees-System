import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.tsx";
import { AppShell } from "./layouts/AppShell.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { DashboardPage } from "./pages/DashboardPage.tsx";
import { CasesPage } from "./pages/CasesPage.tsx";
import { NewCasePage } from "./pages/NewCasePage.tsx";
import { CaseWorkspacePage } from "./pages/CaseWorkspacePage.tsx";
import { ResultPage } from "./pages/ResultPage.tsx";
import { RulesPage, AuditPage, AdminPage, ServicesPage, SecurityPage } from "./pages/RulesPage.tsx";
import { HistoryPage, ReviewPage } from "./pages/HistoryPage.tsx";
import { AdminDashboardPage, CitizenDashboardPage, RegisterPage } from "./pages/RolePages.tsx";
import type { Permission } from "@domain/types.ts";
import { PublicCalculatorPage } from "./pages/PublicCalculatorPage.tsx";

function Guard({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center text-muted">جاري التحقق من الجلسة…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PermissionGuard({ permission, children }: Readonly<{ permission: Permission; children: React.ReactNode }>) {
  const { can, loading } = useAuth();
  if (loading) return <div className="p-10 text-center text-muted">جاري التحقق من الصلاحية…</div>;
  if (!can(permission)) return <Navigate to="/" replace />;
  return children;
}

function HomeRedirect() {
  const { user, can } = useAuth();
  if (user?.roles.includes("citizen")) return <Navigate to="/citizen" replace />;
  if (can("dashboard:admin")) return <Navigate to="/admin-dashboard" replace />;
  return <DashboardPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/public/calculator" element={<PublicCalculatorPage />} />
      <Route
        element={
          <Guard>
            <AppShell />
          </Guard>
        }
      >
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
        <Route path="/citizen" element={<CitizenDashboardPage />} />
        <Route path="/cases" element={<PermissionGuard permission="case:view"><CasesPage /></PermissionGuard>} />
        <Route path="/cases/new" element={<PermissionGuard permission="case:create"><NewCasePage /></PermissionGuard>} />
        <Route path="/cases/:id" element={<PermissionGuard permission="case:view"><CaseWorkspacePage /></PermissionGuard>} />
        <Route path="/calculations/:id" element={<PermissionGuard permission="calculation:view"><ResultPage /></PermissionGuard>} />
        <Route path="/history" element={<PermissionGuard permission="calculation:view"><HistoryPage /></PermissionGuard>} />
        <Route path="/review" element={<PermissionGuard permission="calculation:view"><ReviewPage /></PermissionGuard>} />
        <Route path="/rules" element={<PermissionGuard permission="rule:view"><RulesPage /></PermissionGuard>} />
        <Route path="/audit" element={<PermissionGuard permission="audit:view"><AuditPage /></PermissionGuard>} />
        <Route path="/admin" element={<PermissionGuard permission="users:manage"><AdminPage /></PermissionGuard>} />
        <Route path="/services" element={<PermissionGuard permission="services:calculate"><ServicesPage /></PermissionGuard>} />
        <Route path="/security" element={<PermissionGuard permission="security:manage"><SecurityPage /></PermissionGuard>} />
      </Route>
    </Routes>
  );
}
