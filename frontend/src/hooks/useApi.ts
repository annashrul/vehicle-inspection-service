import { useCallback, useState } from "react";
import type { Envelope, FieldError } from "../types/api";
export class ApiError extends Error {
  constructor(
    message: string,
    public errors: FieldError[] = [],
  ) {
    super(message);
  }
}
const base =
  (import.meta as unknown as { env: { VITE_API_URL?: string } }).env
    .VITE_API_URL ?? "http://localhost:8080";
export function useApi() {
  const [loading, setLoading] = useState(false);
  const request = useCallback(
    async <T>(path: string, method = "GET", body?: unknown): Promise<T> => {
      setLoading(true);
      try {
        const response = await fetch(`${base}/api/v1${path}`, {
          method,
          headers: { "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const payload: Envelope<T> = await response.json();
        if (!response.ok || !payload.success)
          throw new ApiError(payload.message, payload.errors);
        return payload.data;
      } catch (e) {
        throw e instanceof ApiError
          ? e
          : new ApiError("Tidak dapat menghubungi server. Coba lagi.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  return { request, loading };
}
