import { ApiError, request } from "@/hooks/useApi";
import type { Inspection, FieldError } from "@/types/api";
import { writePayload, type InspectionValues } from "./inspection-schema";

export type PendingInspection = {
  key: string;
  record: Inspection;
  state: "pending" | "blocked" | "synced";
  error?: string;
};
const changed = () => window.dispatchEvent(new Event("inspection-queue"));
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("logique-offline", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("data");
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
}
export async function localRead<T>(key: string): Promise<T | undefined> {
  const db = await database();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction("data");
      const read = tx.objectStore("data").get(key);
      tx.oncomplete = () => resolve(read.result as T | undefined);
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
export async function localWrite(key: string, value: unknown) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("data", "readwrite");
      tx.objectStore("data").put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Penyimpanan perangkat gagal."));
    });
  } finally { db.close(); }
}
export async function queueEntries(): Promise<PendingInspection[]> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("data");
      const read = tx.objectStore("data").getAll();
      tx.oncomplete = () => resolve(read.result.filter((v) => v?.key?.startsWith("queue:")));
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
export async function enqueue(values: InspectionValues, submit: boolean, record: Inspection | null) {
  const work = async () => {
    if (record?.id && !record.client_id)
      throw new Error("Buka ulang inspeksi saat online untuk menyiapkan identitas sinkronisasi.");
    const client = record?.client_id ?? crypto.randomUUID();
    const previous = await localRead<PendingInspection>(`queue:${client}`);
    if (previous?.state === "blocked" || (previous?.state === "pending" && previous.record.status === "SUBMITTED"))
      throw new Error("Antrean ini terkunci. Tinjau status sinkronisasi sebelum menyimpan ulang.");
    if (previous?.state === "synced" && previous.record.version > (record?.version ?? 0))
      throw new Error("Data sudah disinkronkan di tab lain. Muat ulang sebelum menyimpan perubahan.");
    const entry: PendingInspection = {
      key: `queue:${client}`,
      state: "pending",
      record: {
        ...writePayload(values), id: record?.id ?? 0, client_id: client,
        version: record?.version ?? 0, status: submit ? "SUBMITTED" : "DRAFT",
      },
    };
    await localWrite(entry.key, entry);
    changed();
    return entry;
  };
  return navigator.locks ? navigator.locks.request("inspection-sync", work) : work();
}
type SyncResult = { client_id: string; result: string; inspection_id: number; server_version: number; errors?: FieldError[] };
let running: Promise<void> | undefined;
export function syncQueue(): Promise<void> {
  if (running) return running;
  const work = async () => {
    if (!navigator.onLine) return;
    let device = await localRead<string>("device");
    if (!device) { device = crypto.randomUUID(); await localWrite("device", device); }
    for (const entry of await queueEntries()) {
      if (entry.state !== "pending" || !navigator.onLine) continue;
      const { version } = entry.record;
      const { client_id, vehicle_id, inspector_name, has_key, status, items } = entry.record;
      const payload = { client_id, vehicle_id, inspector_name, has_key, status, items };
      try {
        const response = await request<{ results: SyncResult[] }>("/inspections/sync", "POST", {
          device_id: device, inspections: [{ ...payload, base_version: version || null }],
        }, AbortSignal.timeout(15000));
        const result = response.results.find((r) => r.client_id === entry.record.client_id);
        if (!result) throw new Error("Respons sinkronisasi tidak lengkap.");
        if (["CREATED", "UPDATED", "DUPLICATE"].includes(result.result)) {
          entry.state = "synced";
          entry.error = undefined;
          entry.record.id = result.inspection_id;
          entry.record.version = result.server_version;
          await localWrite(`record:${result.inspection_id}`, entry.record);
        } else {
          entry.state = "blocked";
          if (result.inspection_id) entry.record.id = result.inspection_id;
          entry.error = result.result === "CONFLICT"
            ? "Konflik versi server. Data lokal tetap tersimpan; tinjau data server sebelum mengubahnya."
            : `Ditolak server: ${result.errors?.map((e) => `${e.field}: ${e.reason}`).join(", ")}`;
        }
        await localWrite(entry.key, entry);
        changed();
      } catch (error) {
        entry.error = error instanceof ApiError ? error.message : "Sinkronisasi tertunda. Akan dicoba kembali otomatis.";
        await localWrite(entry.key, entry);
        changed();
        break;
      }
    }
  };
  running = (async () => {
    if (navigator.locks) await navigator.locks.request("inspection-sync", work);
    else await work();
  })().finally(() => { running = undefined; });
  return running;
}
