import { useCallback, useEffect, useState } from "react";
import { ApiError, request } from "./useApi";
import type { Inspection, Vehicle } from "@/types/api";
import { localRead, localWrite, queueEntries, type PendingInspection } from "@/lib/offline";
export function useInspection(id?: string) {
  const [state, setState] = useState<{
    loading: boolean;
    error: ApiError | null;
    vehicles: Vehicle[];
    record: Inspection | null;
  }>({ loading: true, error: null, vehicles: [], record: null });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: null }));
    const load = async (): Promise<[Vehicle[], Inspection | null]> => {
      const local = id?.startsWith("local-")
        ? await localRead<PendingInspection>(`queue:${id.slice(6)}`)
        : window.location.search.includes("server=1") ? undefined :
          (await queueEntries().catch(() => [])).find((entry) => entry.record.id === Number(id) && entry.state !== "synced");
      if (local) {
        const vehicles = await localRead<Vehicle[]>("vehicles");
        return [vehicles ?? [], local.record];
      }
      if (id?.startsWith("local-")) throw new ApiError("Inspeksi lokal tidak ditemukan di perangkat ini.", 404);
      try {
        const result = await Promise.all([
          request<Vehicle[]>("/vehicles", "GET", undefined, controller.signal),
          id
            ? request<Inspection>(
                `/inspections/${id}`,
                "GET",
                undefined,
                controller.signal,
              )
            : Promise.resolve(null),
        ]);
        // Cache reads explicitly in IndexedDB; API responses stay outside the service-worker cache.
        await localWrite("vehicles", result[0]).catch(() => {});
        if (result[1]) await localWrite(`record:${id}`, result[1]).catch(() => {});
        return result;
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 0) throw error;
        const vehicles = await localRead<Vehicle[]>("vehicles");
        const record = id ? await localRead<Inspection>(`record:${id}`) : null;
        if (vehicles && (!id || record)) return [vehicles, record ?? null];
        throw error;
      }
    };
    load()
      .then(([vehicles, record]) => {
        if (!controller.signal.aborted)
          setState({ loading: false, error: null, vehicles, record });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState((previous) => ({
            ...previous,
            loading: false,
            error:
              error instanceof ApiError
                ? error
                : new ApiError("Data belum dapat dimuat.", 0),
          }));
      });
    return () => controller.abort();
  }, [id, revision]);
  return { ...state, refresh, revision };
}
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
