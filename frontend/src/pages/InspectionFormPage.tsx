import { useCallback, useEffect, useRef, useState } from "react";
import {
  FormProvider,
  useForm,
  useFormState,
  type FieldErrors,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import {
  CircleAlert,
  CloudOff,
  ListChecks,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ChecklistProgress } from "@/components/inspection/ChecklistProgress";
import { ChecklistAccordion } from "@/components/inspection/ChecklistAccordion";
import { InspectionInformation } from "@/components/inspection/InspectionInformation";
import {
  AppHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
  StickyActionBar,
  ValidationSummary,
} from "@/components/inspection/shared";
import {
  ErrorNavigationContext,
  mapBackendErrors,
  orderedErrors,
  useErrorNavigation,
  type Issue,
} from "@/hooks/useErrorNavigation";
import { useInspection, useOnline } from "@/hooks/useInspection";
import { ApiError, request } from "@/hooks/useApi";
import {
  emptyValues,
  fromInspection,
  inspectionSchema,
  writePayload,
  type InspectionValues,
  type ValidationMode,
} from "@/lib/inspection-schema";
import type { Inspection, Vehicle } from "@/types/api";
import { PwaActions } from "@/components/pwa/PwaContext";
import type { Section } from "@/lib/checklist";
import { enqueue, localRead, localWrite, syncQueue, type PendingInspection } from "@/lib/offline";
function SummaryContent({ record }: { record: Inspection | null }) {
  return (
    <>
      <ChecklistProgress />
      <Separator className="my-5" />
      <div className="summary-status">
        <span>Status inspeksi</span>
        <StatusBadge status={record?.status} />
      </div>
      <div className="summary-status">
        <span>Versi server</span>
        <strong>{record?.version ?? "Belum disimpan"}</strong>
      </div>
      <div className="summary-guidance">
        <ShieldCheck aria-hidden />
        <p>
          Draft boleh sebagian. Submit hanya tersedia setelah seluruh 14 titik
          valid.
        </p>
      </div>
      <PwaActions />
    </>
  );
}
function MobileProgress({ onSummary }: { onSummary: () => void }) {
  return (
    <div className="mobile-progress">
      <ChecklistProgress compact />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onSummary}
        aria-label="Buka ringkasan pemeriksaan"
      >
        <ListChecks />
      </Button>
    </div>
  );
}
function ErrorCount({ onSummary }: { onSummary: () => void }) {
  const { errors } = useFormState<InspectionValues>();
  const count = orderedErrors(errors).length;
  return count ? (
    <Button
      type="button"
      variant="outline"
      className="error-count"
      onClick={onSummary}
    >
      <CircleAlert />
      {count} kolom perlu diperiksa
    </Button>
  ) : null;
}
function InspectionEditor({
  record,
  vehicles,
  onRefresh,
}: {
  record: Inspection | null;
  vehicles: Vehicle[];
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const online = useOnline();
  const [serverRecord, setServerRecord] = useState(record);
  const [open, setOpen] = useState<string[]>(["EXTERIOR"]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<
    "submit" | "refresh" | "uncertain" | null
  >(null);
  const [conflict, setConflict] = useState(false);
  const [serverError, setServerError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [sheet, setSheet] = useState(false);
  const sheetTarget = useRef<Issue["path"] | null>(null);
  const inFlight = useRef(false);
  const mode = useRef<ValidationMode>("draft");
  const ids = vehicles.map((v) => v.id);
  const resolver: Resolver<InspectionValues> = (values, context, options) =>
    zodResolver(inspectionSchema(mode.current, ids))(values, context, options);
  const form = useForm<InspectionValues>({
    defaultValues: record ? fromInspection(record) : emptyValues(),
    resolver,
    shouldFocusError: false,
    shouldUnregister: false,
    criteriaMode: "all",
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });
  const openSection = useCallback(
    (section: Section) =>
      setOpen((old) => (old.includes(section) ? old : [...old, section])),
    [],
  );
  const navigation = useErrorNavigation(form, openSection);
  const readOnly =
    !!serverRecord && !["DRAFT", "RECHECK"].includes(serverRecord.status);
  const dirty = form.formState.isDirty;
  useEffect(() => {
    const synced = () => {
      if (!serverRecord?.client_id) return;
      void localRead<PendingInspection>(`queue:${serverRecord.client_id}`).then((entry) => {
        if (entry?.state === "synced" && !form.formState.isDirty) {
          setServerRecord(entry.record);
          form.reset(fromInspection(entry.record));
          if (!record?.id) navigate(`/inspections/${entry.record.id}`, { replace: true });
        }
      }).catch(() => {});
    };
    window.addEventListener("inspection-queue", synced);
    return () => window.removeEventListener("inspection-queue", synced);
  }, [serverRecord?.client_id, form, navigate, record?.id]);
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("inspection-dirty", { detail: dirty }),
    );
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.dispatchEvent(
        new CustomEvent("inspection-dirty", { detail: false }),
      );
    };
  }, [dirty]);
  const invalid = (errors: FieldErrors<InspectionValues>) => {
    const issues = orderedErrors(errors);
    if (issues[0]) navigation.navigate(issues[0].path);
    toast.error("Ada kolom yang perlu diperbaiki.", {
      id: "inspection-validation",
    });
  };
  async function save(values: InspectionValues, submit: boolean) {
    if (inFlight.current || readOnly || conflict || uncertain)
      return;
    inFlight.current = true;
    setBusy(true);
    setServerError("");
    form.clearErrors();
    let saved: Inspection | null = null;
    try {
      const queued = serverRecord?.client_id
        ? await localRead<PendingInspection>(`queue:${serverRecord.client_id}`).catch(() => undefined) : undefined;
      if (!online || serverRecord?.id === 0 || (queued && queued.state !== "synced")) {
        const entry = await enqueue(values, submit, serverRecord);
        setServerRecord(entry.record);
        form.reset(fromInspection(entry.record));
        toast.success("Inspeksi tersimpan di perangkat dan akan disinkronkan otomatis.");
        if (!record) navigate(`/inspections/local-${entry.record.client_id}`, { replace: true });
        if (navigator.onLine) void syncQueue().catch(() => {});
        return;
      }
      saved = await request<Inspection>(
        serverRecord ? `/inspections/${serverRecord.id}` : "/inspections",
        serverRecord ? "PUT" : "POST",
        {
          ...writePayload(values),
          ...(serverRecord ? { version: serverRecord.version } : {}),
        },
      );
      setServerRecord(saved);
      form.reset(fromInspection(saved));
      await localWrite(`record:${saved.id}`, saved).catch(() => {});
      if (submit) {
        saved = await request<Inspection>(
          `/inspections/${saved.id}/transition`,
          "POST",
          { to: "SUBMITTED", actor: values.inspector_name, note: null },
        );
        setServerRecord(saved);
        form.reset(fromInspection(saved));
        await localWrite(`record:${saved.id}`, saved).catch(() => {});
      }
      toast.success(
        submit
          ? "Inspeksi berhasil diajukan."
          : "Draft berhasil disimpan di server.",
      );
      if (!record) navigate(`/inspections/${saved.id}`, { replace: true });
    } catch (error) {
      const failure =
        error instanceof ApiError
          ? error
          : new ApiError(
              error instanceof Error ? error.message : "Permintaan belum dapat diproses. Data form tetap tersedia.",
              500,
            );
      if (failure.status === 409) setConflict(true);
      else if (failure.status === 400) {
        const issues = mapBackendErrors(failure.errors, form);
        if (!issues.length)
          form.setError("root.server", { message: failure.message });
        if (issues[0]) navigation.navigate(issues[0].path);
      } else {
        setServerError(failure.message);
        if (failure.status === 0) setUncertain(true);
      }
      if (saved) {
        setServerError(
          `Draft #${saved.id} sudah tersimpan, tetapi proses submit belum selesai. ${failure.message}`,
        );
      }
      toast.error(
        failure.status === 409
          ? "Versi data berubah. Tinjau versi server sebelum melanjutkan."
          : failure.message,
        failure.status === 400 ? { id: "inspection-validation" } : undefined,
      );
    } finally {
      setBusy(false);
      inFlight.current = false;
      setConfirm(null);
    }
  }
  function saveDraft() {
    mode.current = "draft";
    void form.handleSubmit((values) => save(values, false), invalid)();
  }
  function submit() {
    mode.current = "submit";
    void form.handleSubmit(() => setConfirm("submit"), invalid)();
  }
  return (
    <FormProvider {...form}>
      <ErrorNavigationContext.Provider value={navigation}>
        <PageHeader
          id={serverRecord?.id}
          status={serverRecord?.status}
          version={serverRecord?.version}
          online={online}
        />
        <div className="workspace">
          <MobileProgress onSummary={() => setSheet(true)} />
          <div className="workspace-grid">
            <form
              className="inspection-form"
              aria-label="Form inspeksi kendaraan"
              onSubmit={(event) => {
                event.preventDefault();
                saveDraft();
              }}
              noValidate
            >
              {!online && (
                <Alert className="network-alert">
                  <CloudOff />
                  <AlertTitle>Anda sedang offline</AlertTitle>
                  <AlertDescription>
                    Simpan Draft atau Submit untuk menyimpan inspeksi di perangkat.
                    Data akan disinkronkan otomatis saat koneksi kembali dan aplikasi terbuka.
                  </AlertDescription>
                </Alert>
              )}
              {readOnly && (
                <Alert className="readonly-alert">
                  <LockKeyhole />
                  <AlertTitle>
                    {serverRecord?.status === "APPROVED"
                      ? "Inspeksi telah disetujui"
                      : "Inspeksi sedang diajukan"}
                  </AlertTitle>
                  <AlertDescription>
                    Detail dapat ditinjau. Perubahan hanya diizinkan pada status
                    Draft atau Periksa ulang.
                  </AlertDescription>
                </Alert>
              )}
              {conflict && (
                <Alert variant="destructive">
                  <CircleAlert />
                  <AlertTitle>Konflik versi data</AlertTitle>
                  <AlertDescription>
                    Data server telah berubah atau statusnya tidak lagi dapat
                    diedit. Perubahan Anda tetap ada di form dan belum menimpa
                    data server.
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConfirm("refresh")}
                    >
                      <RefreshCw />
                      Tinjau versi server
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              {serverError && (
                <Alert variant="destructive">
                  <CircleAlert />
                  <AlertTitle>Penyimpanan belum selesai</AlertTitle>
                  <AlertDescription>
                    {serverError}
                    {uncertain && (
                      <>
                        <p>
                          Status permintaan terakhir belum dapat dipastikan.
                          Mengirim ulang pembuatan inspeksi berisiko membuat
                          data ganda.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setConfirm("uncertain")}
                        >
                          Tinjau pengiriman ulang
                        </Button>
                      </>
                    )}
                    {!record && serverRecord && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          navigate(`/inspections/${serverRecord.id}`)
                        }
                      >
                        Buka draft #{serverRecord.id}
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              <InspectionInformation
                vehicles={vehicles}
                readOnly={readOnly}
                lockedVehicle={!!serverRecord}
                busy={busy}
              />
              <ChecklistAccordion
                open={open}
                onOpenChange={setOpen}
                readOnly={readOnly}
                busy={busy}
              />
              <ValidationSummary />
              <ErrorCount onSummary={() => setSheet(true)} />
              <StickyActionBar
                busy={busy}
                disabled={conflict || uncertain}
                readOnly={readOnly}
                dirty={dirty}
                onSave={saveDraft}
                onSubmit={submit}
              />
            </form>
            <aside className="desktop-sidebar" aria-label="Ringkasan inspeksi">
              <Card>
                <CardHeader>
                  <CardTitle>Ringkasan inspeksi</CardTitle>
                </CardHeader>
                <CardContent>
                  <SummaryContent record={serverRecord} />
                </CardContent>
              </Card>
              <div className="sidebar-tip">
                <span>CATATAN LAPANGAN</span>
                <p>
                  Catat temuan segera setelah pemeriksaan. Gunakan nama foto
                  yang mudah dikenali.
                </p>
              </div>
            </aside>
          </div>
        </div>
        <Sheet open={sheet} onOpenChange={setSheet}>
          <SheetContent
            className="inspection-sheet"
            onCloseAutoFocus={(event) => {
              if (sheetTarget.current) {
                event.preventDefault();
                navigation.navigate(sheetTarget.current);
                sheetTarget.current = null;
              }
            }}
          >
            <SheetHeader>
              <SheetTitle>Ringkasan pemeriksaan</SheetTitle>
              <SheetDescription>
                Status kelengkapan dan kolom yang perlu ditinjau.
              </SheetDescription>
            </SheetHeader>
            <div className="sheet-body">
              <SummaryContent record={serverRecord} />
              <ValidationSummary
                compact
                onNavigate={(path) => {
                  sheetTarget.current = path;
                  setSheet(false);
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
        <Dialog
          open={!!confirm}
          onOpenChange={(value) => {
            if (!value && !busy) setConfirm(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {confirm === "submit"
                  ? "Ajukan hasil inspeksi?"
                  : confirm === "refresh"
                    ? "Muat versi terbaru dari server?"
                    : "Status pengiriman belum pasti"}
              </DialogTitle>
              <DialogDescription>
                {confirm === "submit"
                  ? "Seluruh 14 titik telah valid. Data akan disimpan, lalu diajukan untuk ditinjau. Inspeksi yang diajukan tidak dapat diedit."
                  : confirm === "refresh"
                    ? "Data form yang belum disimpan akan digantikan oleh versi terbaru dari server. Tidak ada data server yang akan diubah."
                    : "Permintaan sebelumnya mungkin sudah diterima server. Pastikan data belum tersimpan sebelum mengulangi, terutama untuk inspeksi baru."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirm(null)}
              >
                Kembali
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (confirm === "submit") {
                    mode.current = "submit";
                    void form.handleSubmit(
                      (values) => save(values, true),
                      invalid,
                    )();
                  } else if (confirm === "refresh") {
                    setConfirm(null);
                    onRefresh();
                  } else {
                    setUncertain(false);
                    setConfirm(null);
                    toast.info(
                      "Anda dapat menyimpan ulang setelah memastikan status data server.",
                    );
                  }
                }}
              >
                {busy
                  ? "Memproses…"
                  : confirm === "submit"
                    ? "Ya, ajukan inspeksi"
                    : confirm === "refresh"
                      ? "Muat versi server"
                      : "Saya sudah memastikan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ErrorNavigationContext.Provider>
    </FormProvider>
  );
}
export default function InspectionFormPage() {
  const { id } = useParams();
  const resource = useInspection(id);
  const online = useOnline();
  return (
    <>
      <a className="skip-link" href="#main-content">
        Lewati ke formulir
      </a>
      <AppHeader online={online} />
      <main id="main-content" className="app-main" tabIndex={-1}>
        {resource.loading ? (
          <>
            <PageHeader online={online} />
            <div className="workspace">
              <LoadingState />
            </div>
          </>
        ) : resource.error ? (
          <>
            <PageHeader online={online} />
            <div className="workspace">
              <ErrorState
                notFound={resource.error.status === 404}
                message={resource.error.message}
                onRetry={resource.refresh}
              />
            </div>
          </>
        ) : !resource.vehicles.length ? (
          <>
            <PageHeader online={online} />
            <div className="workspace">
              <EmptyState />
            </div>
          </>
        ) : (
          <InspectionEditor
            key={`${id ?? "new"}-${resource.revision}`}
            record={resource.record}
            vehicles={resource.vehicles}
            onRefresh={resource.refresh}
          />
        )}
      </main>
    </>
  );
}
