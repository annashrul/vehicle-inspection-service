import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { CircleAlert, Download, RefreshCw } from "lucide-react";
import { PwaContext } from "./PwaContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
export function PwaProvider({ children }: { children: ReactNode }) {
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const [deferred, setDeferred] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia("(display-mode: standalone)").matches,
  );
  const [dirty, setDirty] = useState(false);
  const [dialog, setDialog] = useState<"install" | "update" | null>(null);
  const [updating, setUpdating] = useState(false);
  const accepted = useRef(false);
  const reloaded = useRef(false);
  const previouslyControlled = useRef(!!navigator.serviceWorker?.controller);
  const [externalChange, setExternalChange] = useState(false);
  const reloadAccepted = useCallback(() => {
    if (accepted.current && !reloaded.current) {
      reloaded.current = true;
      window.location.reload();
    }
  }, []);
  const {
    needRefresh: [needsRefresh],
  } = useRegisterSW({
    immediate: true,
    onNeedReload: reloadAccepted,
    onRegisteredSW(_url, reg) {
      registration.current = reg;
    },
    onRegisterError() {
      toast.error(
        "Mode aplikasi offline belum tersedia. Aplikasi online tetap dapat digunakan.",
      );
    },
  });
  const needRefresh = needsRefresh || externalChange;
  useEffect(() => {
    const controllerChanged = () => {
      if (accepted.current) reloadAccepted();
      else if (previouslyControlled.current) setExternalChange(true);
      previouslyControlled.current = true;
    };
    navigator.serviceWorker?.addEventListener(
      "controllerchange",
      controllerChanged,
    );
    const prompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallPrompt);
    };
    const installed = () => {
      setInstalled(true);
      setDeferred(null);
    };
    const changed = (event: Event) =>
      setDirty(Boolean((event as CustomEvent<boolean>).detail));
    const check = () => {
      if (navigator.onLine && document.visibilityState === "visible")
        void registration.current?.update().catch(() => {
          /* Retry on the next foreground/online event. */
        });
    };
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", installed);
    window.addEventListener("inspection-dirty", changed);
    window.addEventListener("online", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        controllerChanged,
      );
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("appinstalled", installed);
      window.removeEventListener("inspection-dirty", changed);
      window.removeEventListener("online", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [reloadAccepted]);
  useEffect(() => {
    if (needRefresh)
      toast.info("Versi baru aplikasi tersedia.", {
        id: "pwa-update",
        duration: Infinity,
        action: { label: "Tinjau", onClick: () => setDialog("update") },
      });
    else toast.dismiss("pwa-update");
  }, [needRefresh]);
  async function install() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const result = await deferred.userChoice;
      if (result.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      setDialog(null);
    } catch {
      toast.error(
        "Pemasangan belum selesai. Anda dapat menggunakan menu browser untuk mencoba kembali.",
      );
    }
  }
  function update() {
    if (dirty || updating) return;
    accepted.current = true;
    setUpdating(true);
    try {
      const waiting = registration.current?.waiting;
      if (waiting) waiting.postMessage({ type: "SKIP_WAITING" });
      else reloadAccepted();
    } catch {
      accepted.current = false;
      setUpdating(false);
      toast.error(
        "Pembaruan belum berhasil. Silakan coba lagi saat koneksi tersedia.",
      );
    }
  }
  return (
    <PwaContext.Provider
      value={{
        installed,
        updateAvailable: needRefresh,
        openInstall: () => setDialog("install"),
        openUpdate: () => setDialog("update"),
      }}
    >
      {children}
      <Dialog
        open={!!dialog}
        onOpenChange={(value) => {
          if (!value && !updating) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "install"
                ? "Pasang aplikasi inspeksi"
                : "Perbarui aplikasi?"}
            </DialogTitle>
            <DialogDescription>
              {dialog === "install"
                ? "Buka aplikasi langsung dari layar utama dalam tampilan mandiri. Koneksi internet tetap diperlukan untuk memuat dan menyimpan data inspeksi."
                : "Versi baru sudah tersedia. Pembaruan akan memuat ulang aplikasi; simpan perubahan terlebih dahulu."}
            </DialogDescription>
          </DialogHeader>
          {dialog === "install" ? (
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                Jika browser mendukung pemasangan, pilih{" "}
                <strong>Instal aplikasi</strong> di menu browser.
              </p>
              <p>
                Di iPhone atau iPad, buka menu{" "}
                <strong>Bagikan → Tambah ke Layar Utama</strong>.
              </p>
              <p className="text-muted-foreground">
                Mode offline hanya menyediakan kerangka aplikasi. Draft inspeksi
                belum disimpan otomatis di perangkat.
              </p>
            </div>
          ) : dirty ? (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>
                Masih ada perubahan yang belum disimpan. Simpan draft di server
                sebelum memperbarui aplikasi.
              </AlertDescription>
            </Alert>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tidak ada perubahan form yang belum disimpan.
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={updating}
              onClick={() => setDialog(null)}
            >
              Nanti
            </Button>
            {dialog === "install" && deferred ? (
              <Button type="button" onClick={() => void install()}>
                <Download aria-hidden />
                Pasang sekarang
              </Button>
            ) : dialog === "update" ? (
              <Button
                type="button"
                disabled={dirty || updating}
                onClick={() => void update()}
              >
                <RefreshCw aria-hidden />
                {updating ? "Memperbarui…" : "Perbarui sekarang"}
              </Button>
            ) : (
              <Button type="button" onClick={() => setDialog(null)}>
                Mengerti
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PwaContext.Provider>
  );
}
