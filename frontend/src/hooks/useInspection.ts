import { useCallback, useEffect, useState } from "react";
import { ApiError, request } from "./useApi";
import type { Inspection, Vehicle } from "@/types/api";
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
    Promise.all([
      request<Vehicle[]>("/vehicles", "GET", undefined, controller.signal),
      id
        ? request<Inspection>(
            `/inspections/${id}`,
            "GET",
            undefined,
            controller.signal,
          )
        : Promise.resolve(null),
    ])
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
