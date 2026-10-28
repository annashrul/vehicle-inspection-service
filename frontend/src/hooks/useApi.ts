import type { Envelope, FieldError } from "@/types/api";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors: FieldError[] = [],
  ) {
    super(message);
  }
}
const base = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}/api/v1${path}`, {
      method,
      cache: "no-store",
      signal,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(
      "Koneksi terputus. Konfirmasi server belum diterima. Periksa koneksi lalu coba lagi.",
      0,
    );
  }
  let payload: Envelope<T>;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(
      "Server memberikan respons yang tidak dapat dibaca. Silakan coba lagi.",
      response.status,
    );
  }
  if (!response.ok || !payload.success)
    throw new ApiError(
      response.status >= 500
        ? "Layanan sedang bermasalah. Data form tetap tersedia; silakan coba lagi."
        : payload.message,
      response.status,
      payload.errors ?? [],
    );
  return payload.data;
}
