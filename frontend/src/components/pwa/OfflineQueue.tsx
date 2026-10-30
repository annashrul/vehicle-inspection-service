import { useEffect, useState } from "react";
import { queueEntries, syncQueue, type PendingInspection } from "@/lib/offline";

export function OfflineQueue() {
  const [entries, setEntries] = useState<PendingInspection[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const update = () => void queueEntries().then(setEntries).catch(() => setError("Penyimpanan offline tidak tersedia di browser ini."));
    const sync = () => void syncQueue().catch(() => setError("Antrean offline belum dapat diproses. Data lokal tetap tersimpan."));
    update(); sync();
    window.addEventListener("inspection-queue", update);
    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);
    const timer = window.setInterval(() => { update(); sync(); }, 15000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("inspection-queue", update);
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);
  const pending = entries.filter((entry) => entry.state !== "synced");
  if (!pending.length && !error) return null;
  return <aside className="mx-auto max-w-6xl p-4" aria-label="Antrean sinkronisasi" aria-live="polite">
    {error && <p role="alert">{error}</p>}
    {pending.length > 0 && <p>{pending.length} inspeksi tersimpan di perangkat, menunggu sinkronisasi. Sinkronisasi otomatis berjalan saat aplikasi terbuka dan koneksi tersedia.</p>}
    {pending.map((entry) => <p key={entry.key}>
      <a className="underline" href={`/inspections/local-${entry.record.client_id}`}>{entry.record.inspector_name} — {entry.record.status}</a>
      {entry.error && <span role="alert"> · {entry.error}</span>}
      {entry.state === "blocked" && entry.record.id > 0 && <> · <a className="underline" href={`/inspections/${entry.record.id}?server=1`}>Tinjau versi server</a></>}
    </p>)}
  </aside>;
}
