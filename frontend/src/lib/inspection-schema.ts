import { z } from "zod";
import { POINTS, CONDITIONS } from "./checklist";
import type { Condition, Inspection, Item } from "@/types/api";
export type FormItem = {
  point_code: string;
  condition: Condition | "";
  note: string;
  photo_refs: { value: string }[];
};
export type InspectionValues = {
  vehicle_id: string;
  inspector_name: string;
  has_key: boolean;
  items: FormItem[];
};
export type ValidationMode = "draft" | "submit";
export function emptyValues(): InspectionValues {
  return {
    vehicle_id: "",
    inspector_name: "",
    has_key: true,
    items: POINTS.map((p) => ({
      point_code: p.point_code,
      condition: "",
      note: "",
      photo_refs: [],
    })),
  };
}
export function fromInspection(record: Inspection): InspectionValues {
  return {
    vehicle_id: String(record.vehicle_id),
    inspector_name: record.inspector_name,
    has_key: record.has_key,
    items: POINTS.map((p) => {
      const i = record.items.find((i) => i.point_code === p.point_code);
      return {
        point_code: p.point_code,
        condition: i?.condition ?? "",
        note: i?.note ?? "",
        photo_refs: (i?.photo_refs ?? []).map((value) => ({ value })),
      };
    }),
  };
}
export function itemStarted(item: FormItem) {
  return !!item.condition || !!item.note.trim() || item.photo_refs.length > 0;
}
export function itemIssues(
  item: FormItem,
  hasKey: boolean,
): { field: "condition" | "note" | "photo_refs"; message: string }[] {
  const errors: ReturnType<typeof itemIssues> = [];
  const point = POINTS.find((p) => p.point_code === item.point_code);
  if (!point || !CONDITIONS.includes(item.condition as Condition))
    errors.push({ field: "condition", message: "Pilih kondisi pemeriksaan." });
  if (
    !hasKey &&
    point?.section === "ENGINE" &&
    item.condition !== "NOT_INSPECTABLE"
  )
    errors.push({
      field: "condition",
      message: "Tanpa kunci, kondisi mesin harus tidak dapat diperiksa.",
    });
  if (item.condition === "NOT_INSPECTABLE" && !item.note.trim())
    errors.push({
      field: "note",
      message: "Catatan wajib untuk kondisi tidak dapat diperiksa.",
    });
  if (
    item.condition === "MAJOR_DAMAGE" &&
    !item.photo_refs.some((p) => p.value.trim())
  )
    errors.push({
      field: "photo_refs",
      message: "Tambahkan minimal satu referensi foto untuk kerusakan besar.",
    });
  if (item.photo_refs.some((p) => !p.value.trim()))
    errors.push({
      field: "photo_refs",
      message: "Isi nama foto yang ditambahkan atau hapus kolom kosong.",
    });
  return errors;
}
export function isItemValid(item: FormItem, hasKey: boolean) {
  return itemStarted(item) && itemIssues(item, hasKey).length === 0;
}
export function inspectionSchema(mode: ValidationMode, vehicleIds: number[]) {
  return z
    .object({
      vehicle_id: z
        .string()
        .refine(
          (v) => vehicleIds.includes(Number(v)),
          "Pilih kendaraan yang tersedia.",
        ),
      inspector_name: z
        .string()
        .refine((v) => !!v.trim(), "Nama inspektur wajib diisi.")
        .refine(
          (v) => v.length <= 200,
          "Nama inspektur maksimal 200 karakter.",
        ),
      has_key: z.boolean(),
      items: z.array(
        z.object({
          point_code: z.string(),
          condition: z.union([z.enum(CONDITIONS), z.literal("")]),
          note: z.string(),
          photo_refs: z.array(
            z.object({
              value: z
                .string()
                .refine(
                  (v) => !!v.trim(),
                  "Isi nama foto atau hapus kolom kosong.",
                ),
            }),
          ),
        }),
      ),
    })
    .superRefine((values, ctx) => {
      const seen = new Set<string>();
      values.items.forEach((item, index) => {
        if (
          !POINTS.some((p) => p.point_code === item.point_code) ||
          seen.has(item.point_code)
        )
          ctx.addIssue({
            code: "custom",
            path: ["items", index, "condition"],
            message: "Titik pemeriksaan tidak valid atau ganda.",
          });
        seen.add(item.point_code);
        if (mode === "draft" && !itemStarted(item)) return;
        for (const error of itemIssues(item, values.has_key)) {
          if (error.field === "photo_refs" && item.photo_refs.length > 0)
            continue;
          ctx.addIssue({
            code: "custom",
            path: ["items", index, error.field],
            message: error.message,
          });
        }
      });
      if (mode === "submit")
        POINTS.forEach((point, index) => {
          if (!seen.has(point.point_code))
            ctx.addIssue({
              code: "custom",
              path: ["items", index, "condition"],
              message: "Titik pemeriksaan wajib tersedia sebelum submit.",
            });
        });
    });
}
export function writePayload(values: InspectionValues) {
  return {
    vehicle_id: Number(values.vehicle_id),
    inspector_name: values.inspector_name,
    has_key: values.has_key,
    items: values.items
      .filter(itemStarted)
      .map((i) => ({
        point_code: i.point_code,
        condition: i.condition as Condition,
        note: i.note || null,
        photo_refs: i.photo_refs.map((p) => p.value.trim()),
      })) satisfies Item[],
  };
}
