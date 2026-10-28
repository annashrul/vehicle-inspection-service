import { useEffect, useState, type ReactNode } from "react";
import { useFormContext, useFormState, get } from "react-hook-form";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  ClipboardCheck,
  Cloud,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Save,
  Send,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Status } from "@/types/api";
import type { InspectionValues } from "@/lib/inspection-schema";
import {
  errorMessage,
  orderedErrors,
  useErrorNavigator,
  type FormPath,
  type Issue,
} from "@/hooks/useErrorNavigation";
export const fieldId = (name: string) => `field-${name.replaceAll(".", "-")}`;
export function FieldError({ name }: { name: FormPath }) {
  const { control } = useFormContext<InspectionValues>();
  const { errors } = useFormState({ control, name });
  const message = errorMessage(get(errors, name));
  return message ? (
    <p id={`${fieldId(name)}-error`} className="field-error">
      <CircleAlert aria-hidden className="size-3.5 shrink-0" />
      {message}
    </p>
  ) : null;
}
export function FormField({
  name,
  label,
  hint,
  children,
  required = false,
}: {
  name: FormPath;
  label: string;
  hint?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="form-field">
      <Label htmlFor={fieldId(name)}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            {" "}
            *
          </span>
        )}
      </Label>
      {hint && (
        <p className="field-hint" id={`${fieldId(name)}-hint`}>
          {hint}
        </p>
      )}
      {children}
      <FieldError name={name} />
    </div>
  );
}
export function useFieldA11y(name: FormPath, hint = false) {
  const { control } = useFormContext<InspectionValues>();
  const { errors } = useFormState({ control, name });
  const message = errorMessage(get(errors, name));
  return {
    id: fieldId(name),
    "aria-invalid": !!message,
    "aria-describedby":
      [
        hint ? `${fieldId(name)}-hint` : null,
        message ? `${fieldId(name)}-error` : null,
      ]
        .filter(Boolean)
        .join(" ") || undefined,
  };
}
export function StatusBadge({ status = "DRAFT" }: { status?: Status }) {
  const content: Record<Status, [string, string]> = {
    DRAFT: ["Draft", "status-draft"],
    SUBMITTED: ["Diajukan", "status-submitted"],
    RECHECK: ["Periksa ulang", "status-recheck"],
    APPROVED: ["Disetujui", "status-approved"],
  };
  const [label, style] = content[status];
  return (
    <Badge
      variant="outline"
      className={cn("status-badge", style)}
      data-testid="inspection-status"
    >
      {status === "APPROVED" ? (
        <Check aria-hidden />
      ) : status === "SUBMITTED" ? (
        <Send aria-hidden />
      ) : (
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
      )}
      {label}
      <span className="sr-only">{status}</span>
    </Badge>
  );
}
export function AppHeader({ online }: { online: boolean }) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <Link
          to="/inspections/new"
          aria-label="LOGIQUE · Inspeksi baru"
          className="brand"
        >
          <span className="brand-mark">
            <ClipboardCheck aria-hidden />
          </span>
          LOGIQUE
          <span className="brand-divider" />
          <span className="brand-subtitle">Inspection Service</span>
        </Link>
        <span className={cn("connection", !online && "offline")} role="status">
          {online ? <Cloud aria-hidden /> : <WifiOff aria-hidden />}
          {online ? "Online" : "Offline"}
        </span>
      </div>
    </header>
  );
}
export function PageHeader({
  id,
  status,
  version,
}: {
  id?: number;
  status?: Status;
  version?: number;
  online?: boolean;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">
          <span className="eyebrow-line" />
          OPERASIONAL LAPANGAN
        </p>
        <h1>{id ? `Inspeksi #${id}` : "Inspeksi kendaraan"}</h1>
        <p>
          {id
            ? "Tinjau dan kelola hasil pemeriksaan kendaraan."
            : "Pemeriksaan yang teliti dimulai dari catatan yang lengkap."}
        </p>
      </div>
      <div className="heading-meta">
        <StatusBadge status={status} />
        <span className="version-label">Versi {version ?? 1}</span>
      </div>
    </div>
  );
}

export function FormSection({
  title,
  description,
  number,
  children,
}: {
  title: string;
  description: string;
  number: string;
  children: ReactNode;
}) {
  return (
    <Card className="section-card">
      <CardHeader>
        <div className="section-title">
          <span className="section-number">{number}</span>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
export function ValidationSummary({
  issues: onIssues,
  onNavigate,
  compact = false,
}: {
  issues?: Issue[];
  onNavigate?: (path: Issue["path"]) => void;
  compact?: boolean;
}) {
  const { control } = useFormContext<InspectionValues>();
  const { errors } = useFormState({ control });
  const issues = onIssues ?? orderedErrors(errors);
  const nav = useErrorNavigator();
  useEffect(() => {
    if (!issues.length) toast.dismiss("inspection-validation");
  }, [issues.length]);
  if (!issues.length) return null;
  return (
    <Alert
      variant="destructive"
      id={compact ? undefined : "validation-summary"}
      className="validation-summary"
    >
      <CircleAlert aria-hidden />
      <AlertTitle>Periksa {issues.length} kolom sebelum melanjutkan</AlertTitle>
      <AlertDescription>
        <ul>
          {issues.map((issue) => (
            <li key={issue.path}>
              <button
                type="button"
                onClick={() =>
                  onNavigate ? onNavigate(issue.path) : nav.navigate(issue.path)
                }
              >
                <strong>{issue.label}</strong>
                <span>{issue.message}</span>
              </button>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
export function LoadingState() {
  return (
    <div className="loading-state" role="status" aria-label="Memuat inspeksi">
      <span className="sr-only">Memuat data inspeksi…</span>
      <Skeleton className="h-8 w-56 mb-6" />
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-3/4" />
        </Card>
      ))}
    </div>
  );
}
export function EmptyState() {
  return (
    <Card className="state-card">
      <ClipboardCheck className="size-10 text-muted-foreground" aria-hidden />
      <h2>Belum ada kendaraan</h2>
      <p>
        Kendaraan belum tersedia untuk diperiksa. Hubungi pengelola data
        kendaraan.
      </p>
    </Card>
  );
}
export function ErrorState({
  notFound,
  message,
  onRetry,
}: {
  notFound: boolean;
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="state-card">
      <CircleAlert className="size-10 text-destructive" aria-hidden />
      <h2>
        {notFound ? "Inspeksi tidak ditemukan" : "Data belum dapat dimuat"}
      </h2>
      <p>
        {notFound
          ? "Periksa alamat inspeksi atau mulai pemeriksaan baru."
          : message}
      </p>
      {notFound ? (
        <Button asChild>
          <Link to="/inspections/new">
            <ArrowLeft />
            Buat inspeksi baru
          </Link>
        </Button>
      ) : (
        <Button type="button" onClick={onRetry}>
          <RefreshCw />
          Coba lagi
        </Button>
      )}
    </Card>
  );
}
export function StickyActionBar({
  busy,
  disabled,
  readOnly,
  dirty,
  onSave,
  onSubmit,
}: {
  busy: boolean;
  disabled: boolean;
  readOnly: boolean;
  dirty: boolean;
  onSave: () => void;
  onSubmit: () => void;
}) {
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const update = () =>
      setKeyboard(
        !!window.visualViewport &&
          window.innerHeight - window.visualViewport.height > 150 &&
          !!document.activeElement?.matches("input,textarea"),
      );
    window.visualViewport?.addEventListener("resize", update);
    document.addEventListener("focusout", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      document.removeEventListener("focusout", update);
    };
  }, []);
  return (
    <div
      className="action-bar"
      data-keyboard-open={keyboard}
      data-testid="action-bar"
    >
      <div className="action-note">
        {readOnly ? <LockKeyhole aria-hidden /> : <Save aria-hidden />}
        <span>
          {readOnly
            ? "Detail inspeksi hanya baca"
            : dirty
              ? "Perubahan belum disimpan"
              : "Draft tersimpan setelah konfirmasi server"}
        </span>
      </div>
      <div className="action-buttons">
        <Button
          type="button"
          variant="outline"
          disabled={busy || disabled || readOnly}
          onClick={onSave}
        >
          {busy ? <LoaderCircle className="animate-spin" /> : <Save />}
          <span>Simpan Draft</span>
        </Button>
        <Button
          type="button"
          disabled={busy || disabled || readOnly}
          onClick={onSubmit}
        >
          <Send />
          <span>Submit</span>
        </Button>
      </div>
    </div>
  );
}
