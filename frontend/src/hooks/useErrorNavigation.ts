import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useEffect,
} from "react";
import {
  get,
  type FieldErrors,
  type FieldPath,
  type UseFormReturn,
} from "react-hook-form";
import { POINTS, type Section } from "@/lib/checklist";
import type { InspectionValues } from "@/lib/inspection-schema";
import type { FieldError } from "@/types/api";
export type FormPath = FieldPath<InspectionValues>;
export type Issue = {
  path: FormPath | "root.server";
  label: string;
  message: string;
  section?: Section;
};
export function sectionFor(path: string) {
  const match = /^items\.(\d+)/.exec(path);
  return match ? (POINTS[Number(match[1])]?.section as Section) : undefined;
}
export function fieldLabel(path: string) {
  const main: Record<string, string> = {
    vehicle_id: "Kendaraan",
    inspector_name: "Nama inspektur",
    has_key: "Ketersediaan kunci",
    "root.server": "Permintaan server",
  };
  if (main[path]) return main[path];
  const match = /^items\.(\d+)\.(\w+)/.exec(path);
  return match
    ? `${POINTS[Number(match[1])]?.label ?? "Checklist"} · ${{ condition: "Kondisi", note: "Catatan", photo_refs: "Referensi foto" }[match[2]] ?? "Pemeriksaan"}`
    : "Form inspeksi";
}
export function errorMessage(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const error = value as {
    message?: string;
    types?: Record<string, string | string[]>;
  };
  return [
    ...new Set(
      [error.message, ...Object.values(error.types ?? {}).flat()].filter(
        (v): v is string => typeof v === "string" && !!v,
      ),
    ),
  ].join(" ");
}
export function orderedErrors(errors: FieldErrors<InspectionValues>): Issue[] {
  const result: Issue[] = [];
  const add = (path: string) => {
    const message = errorMessage(get(errors, path));
    if (message)
      result.push({
        path: path as Issue["path"],
        label: fieldLabel(path),
        message,
        section: sectionFor(path),
      });
  };
  ["vehicle_id", "inspector_name", "has_key"].forEach(add);
  POINTS.forEach((_, index) => {
    ["condition", "note", "photo_refs"].forEach((field) => {
      const path = `items.${index}.${field}`;
      if (field !== "photo_refs") add(path);
      if (field === "photo_refs") {
        const rows = get(errors, path);
        if (Array.isArray(rows))
          rows.forEach((_, n) => add(`${path}.${n}.value`));
        add(path);
      }
    });
  });
  add("root.server");
  return result;
}
export function mapBackendField(field: string): Issue["path"] {
  if (["vehicle_id", "inspector_name", "has_key"].includes(field))
    return field as FormPath;
  const match = /^items\.([^.]+)(?:\.(.+))?$/.exec(field);
  if (match) {
    const index = /^\d+$/.test(match[1])
      ? Number(match[1])
      : POINTS.findIndex((p) => p.point_code === match[1]);
    if (index >= 0 && index < POINTS.length) {
      const tail = match[2] ?? "condition";
      if (["condition", "note", "photo_refs"].includes(tail))
        return `items.${index}.${tail}` as FormPath;
    }
  }
  return "root.server";
}
export function mapBackendErrors(
  errors: FieldError[],
  form: UseFormReturn<InspectionValues>,
) {
  const grouped = new Map<Issue["path"], Issue>();
  for (const error of errors) {
    const path = mapBackendField(error.field);
    const existing = grouped.get(path);
    if (existing) existing.message += " " + error.reason;
    else
      grouped.set(path, {
        path,
        label: fieldLabel(path),
        message: error.reason,
        section: sectionFor(path),
      });
  }
  const result = [...grouped.values()];
  const rank = (path: string) => {
    const main = ["vehicle_id", "inspector_name", "has_key"].indexOf(path);
    if (main >= 0) return main;
    const match = /^items\.(\d+)\.(condition|note|photo_refs)/.exec(path);
    return match
      ? 3 +
          Number(match[1]) * 100 +
          ["condition", "note", "photo_refs"].indexOf(match[2]) * 10
      : 9999;
  };
  result.sort((a, b) => rank(a.path) - rank(b.path));
  for (const issue of result)
    form.setError(issue.path, { type: "server", message: issue.message });
  return result;
}
export function useErrorNavigation(
  form: UseFormReturn<InspectionValues>,
  openSection: (section: Section) => void,
) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const pending = useRef<string | null>(null);
  const callbacks = useRef(
    new Map<string, (node: HTMLElement | null) => void>(),
  );
  const rhfRefs = useRef(
    new Map<string, ((node: HTMLElement | null) => void) | undefined>(),
  );
  const frame = useRef<number | null>(null);
  useEffect(
    () => () => {
      pending.current = null;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  const focus = useCallback(
    function settleAndFocus(path: string, previous?: string, stable = 0): void {
      if (pending.current !== path) return;
      const node = nodes.current.get(path);
      if (!node?.isConnected) return;
      if (!node.getClientRects().length) {
        frame.current = requestAnimationFrame(() => settleAndFocus(path));
        return;
      }
      if (node.matches(":disabled")) {
        frame.current = requestAnimationFrame(() => settleAndFocus(path));
        return;
      }
      const panel = node.closest<HTMLElement>(
        '[data-slot="accordion-content"]',
      );
      const rect = node.getBoundingClientRect();
      const geometry = [
        rect.top,
        rect.height,
        panel?.getBoundingClientRect().height ?? 0,
      ].join(":");
      const animating =
        panel
          ?.getAnimations?.()
          .some((animation) => animation.playState === "running") ?? false;
      if (animating || geometry !== previous || stable < 2) {
        frame.current = requestAnimationFrame(() =>
          settleAndFocus(
            path,
            geometry,
            geometry === previous ? stable + 1 : 0,
          ),
        );
        return;
      }
      pending.current = null;
      // Focus without a native jump before RHF touches the already-focused control.
      node.focus({ preventScroll: true });
      form.setFocus(path as FormPath);
      // Instant error navigation also respects reduced motion and avoids moving targets.
      node.scrollIntoView({ block: "center", behavior: "instant" });
    },
    [form],
  );
  const refFor = useCallback(
    (path: FormPath, rhfRef?: (node: HTMLElement | null) => void) => {
      rhfRefs.current.set(path, rhfRef);
      if (!callbacks.current.has(path))
        callbacks.current.set(path, (node) => {
          rhfRefs.current.get(path)?.(node);
          if (node) {
            nodes.current.set(path, node);
            if (pending.current === path)
              requestAnimationFrame(() => focus(path));
          } else nodes.current.delete(path);
        });
      return callbacks.current.get(path)!;
    },
    [focus],
  );
  const navigate = useCallback(
    (path: Issue["path"]) => {
      if (path === "root.server") {
        document
          .getElementById("validation-summary")
          ?.scrollIntoView({ block: "center" });
        return;
      }
      pending.current = path;
      const section = sectionFor(path);
      if (section) openSection(section);
      requestAnimationFrame(() => focus(path));
    },
    [focus, openSection],
  );
  return { refFor, navigate };
}
export type ErrorNavigator = ReturnType<typeof useErrorNavigation>;
export const ErrorNavigationContext = createContext<ErrorNavigator | null>(
  null,
);
export function useErrorNavigator() {
  const context = useContext(ErrorNavigationContext);
  if (!context) throw new Error("ErrorNavigationContext is required");
  return context;
}
