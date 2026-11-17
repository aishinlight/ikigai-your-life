import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { Link, type LinkProps } from "react-router-dom";
import { X, AlertCircle } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]";
const variants: Record<Variant, string> = {
  primary: "bg-foreground text-background hover:bg-foreground/85",
  secondary: "border border-foreground/20 bg-white/60 text-foreground hover:bg-white",
  ghost: "text-accent-strong hover:bg-blush/60",
  danger: "bg-danger text-white hover:bg-danger/90",
};
export const btn = (v: Variant = "primary", extra = "") => `${base} ${variants[v]} ${extra}`;

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>(
  ({ variant = "primary", className = "", type = "button", ...p }, ref) => (
    <button ref={ref} type={type} className={btn(variant, className)} {...p} />
  ),
);
Button.displayName = "Button";

export function LinkButton({ variant = "primary", className = "", ...p }: LinkProps & { variant?: Variant }) {
  return <Link className={btn(variant, className)} {...p} />;
}

export function ExtButton({
  variant = "primary",
  className = "",
  ...p
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) {
  return <a className={btn(variant, className)} {...p} />;
}

export function Reveal({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "li" }) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return setVisible(true);
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (setVisible(true), io.disconnect())),
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={`reveal ${visible ? "is-visible" : ""} ${className}`}>
      {children}
    </Tag>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-2xl bg-foreground/[0.06] ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="container py-16" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <Skeleton className="mb-4 h-10 w-2/3 max-w-md" />
      <Skeleton className="mb-10 h-5 w-1/2 max-w-sm" />
      <div className="grid gap-5 md:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-white/40 p-8 text-center text-muted">
      <p>{children}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children, onRetry, retryLabel }: { children: ReactNode; onRetry?: () => void; retryLabel?: string }) {
  if (!children) return null;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex-1">{children}</div>
      {onRetry && (
        <button onClick={onRetry} className="font-semibold underline underline-offset-2">
          {retryLabel ?? "Retry"}
        </button>
      )}
    </div>
  );
}

export function Notice({ children, tone = "sage" }: { children: ReactNode; tone?: "sage" | "lavender" | "blush" }) {
  const bg = { sage: "bg-sage", lavender: "bg-lavender", blush: "bg-blush" }[tone];
  return <div role="status" className={`rounded-2xl ${bg} p-4 text-sm text-foreground/85`}>{children}</div>;
}

/** Accessible modal dialog: focus trap, Esc to close, restores focus. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  closeLabel = "Close",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  closeLabel?: string;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const node = panel.current;
    const focusables = () =>
      Array.from(node?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])') ?? []);
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="relative w-full max-w-md rounded-card bg-background p-6 shadow-soft sm:p-8"
      >
        <button onClick={onClose} aria-label={closeLabel} className="absolute right-4 top-4 rounded-full p-2 text-muted hover:bg-blush/60">
          <X className="h-5 w-5" aria-hidden />
        </button>
        <h2 id={id} className="mb-3 pr-8 text-2xl">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="text-3xl leading-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}
