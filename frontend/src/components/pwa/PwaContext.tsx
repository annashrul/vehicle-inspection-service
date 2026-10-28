import { createContext, useContext } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
export const PwaContext = createContext<{
  installed: boolean;
  updateAvailable: boolean;
  openInstall: () => void;
  openUpdate: () => void;
} | null>(null);
export function PwaActions() {
  const pwa = useContext(PwaContext);
  if (!pwa) return null;
  return (
    <div className="pwa-actions">
      {!pwa.installed && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={pwa.openInstall}
        >
          <Download aria-hidden />
          Pasang aplikasi
        </Button>
      )}
      {pwa.updateAvailable && (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={pwa.openUpdate}
        >
          <RefreshCw aria-hidden />
          Versi baru tersedia
        </Button>
      )}
    </div>
  );
}
