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

function Guard({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center text-muted">جاري التحقق من الجلسة…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <Guard>
            <AppShell />
          </Guard>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/cases" element={<CasesPage />} />
        <Route path="/cases/new" element={<NewCasePage />} />
        <Route path="/cases/:id" element={<CaseWorkspacePage />} />
        <Route path="/calculations/:id" element={<ResultPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/security" element={<SecurityPage />} />
      </Route>
    </Routes>
  );
}
