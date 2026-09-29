import type { ReactNode } from "react";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: "مسودة", cls: "bg-slate-100 text-navy" },
    SUBMITTED: { label: "مقدّمة", cls: "bg-derive-bg text-derive" },
    CALCULATING: { label: "قيد الاحتساب", cls: "bg-derive-bg text-derive" },
    CALCULATED: { label: "تم الاحتساب", cls: "bg-derive-bg text-derive" },
    PENDING_REVIEW: { label: "معلق للمراجعة", cls: "bg-pending-bg text-pending" },
    RETURNED: { label: "مسترجع للتعديل", cls: "bg-return-bg text-return" },
    APPROVED: { label: "تم التحقق والاعتماد", cls: "bg-verified-bg text-verified" },
    ISSUED: { label: "صادر", cls: "bg-verified-bg text-verified" },
    standard: { label: "تم تطبيق الرسم القياسي", cls: "bg-verified-bg text-verified" },
    reduced: { label: "رسم مخفّض", cls: "bg-pending-bg text-pending" },
    exempt: { label: "إعفاء من الرسم", cls: "bg-slate-100 text-navy" },
    review: { label: "يستلزم الحساب مراجعة قانونية", cls: "bg-pending-bg text-pending" },
  };
  const item = map[status] ?? { label: status, cls: "bg-slate-100 text-navy" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold ${item.cls}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {item.label}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border bg-white shadow-[var(--shadow-card)] ${className}`}>{children}</div>;
}

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-navy">
        {label}
        {required ? <span className="text-return"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs text-return">{error}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-[42px] w-full rounded border border-border-strong bg-white px-3 text-sm text-navy outline-none focus:border-navy focus:shadow-[0_0_0_2px_rgb(197_155_39_/_0.2)]";

export function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "gold" }) {
  const styles = {
    primary: "bg-navy text-white hover:bg-slate-800 border border-slate-800",
    secondary: "bg-white text-navy border border-border-strong hover:bg-canvas",
    danger: "bg-return-bg text-return hover:bg-return hover:text-white",
    gold: "bg-gold-light text-navy hover:bg-gold",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-semibold disabled:opacity-50 ${styles[variant]} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}
