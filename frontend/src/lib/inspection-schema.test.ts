import { describe, it, expect } from "vitest";
import {
  emptyValues,
  inspectionSchema,
  isItemValid,
  writePayload,
  fromInspection,
} from "./inspection-schema";
import { mapBackendField } from "@/hooks/useErrorNavigation";
import { POINTS } from "./checklist";
describe("Kontrak inspeksi frontend", () => {
  it("draft parsial mengirim hanya titik yang sudah diisi", () => {
    const v = emptyValues();
    v.vehicle_id = "1";
    v.inspector_name = "Rina";
    v.items[0].condition = "GOOD";
    expect(inspectionSchema("draft", [1]).safeParse(v).success).toBe(true);
    expect(writePayload(v).items).toHaveLength(1);
    expect(writePayload(v)).not.toHaveProperty("status");
  });
  it("submit memerlukan masing-masing dari 14 titik", () => {
    const v = emptyValues();
    v.vehicle_id = "1";
    v.inspector_name = "Rina";
    const result = inspectionSchema("submit", [1]).safeParse(v);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(
        result.error.issues.filter((i) => i.path[0] === "items"),
      ).toHaveLength(14);
  });
  it("NOT_INSPECTABLE tanpa note tidak valid dan tidak dihitung lengkap", () => {
    const v = emptyValues();
    const item = { ...v.items[0], condition: "NOT_INSPECTABLE" as const };
    expect(isItemValid(item, true)).toBe(false);
    expect(isItemValid({ ...item, note: "Tidak dapat diakses" }, true)).toBe(
      true,
    );
  });
  it("MAJOR_DAMAGE memerlukan foto dan menolak baris foto kosong", () => {
    const item = {
      ...emptyValues().items[0],
      condition: "MAJOR_DAMAGE" as const,
    };
    expect(isItemValid(item, true)).toBe(false);
    expect(
      isItemValid({ ...item, photo_refs: [{ value: "a.jpg" }] }, true),
    ).toBe(true);
    expect(isItemValid({ ...item, photo_refs: [{ value: " " }] }, true)).toBe(
      false,
    );
  });
  it("tanpa kunci menolak kondisi mesin yang melanggar R2", () => {
    const v = emptyValues();
    v.vehicle_id = "1";
    v.inspector_name = "Rina";
    v.has_key = false;
    const i = POINTS.findIndex((p) => p.section === "ENGINE");
    v.items[i].condition = "GOOD";
    expect(inspectionSchema("draft", [1]).safeParse(v).success).toBe(false);
  });
  it("mapping point_code mengikuti posisi canonical, bukan posisi payload server", () => {
    expect(mapBackendField("items.ENG_BAY.note")).toBe(
      `items.${POINTS.findIndex((p) => p.point_code === "ENG_BAY")}.note`,
    );
    expect(mapBackendField("items.EXT_FRONT")).toBe("items.0.condition");
    expect(mapBackendField("version")).toBe("root.server");
  });
  it("edit mempertahankan titik tersimpan dan slot yang belum diperiksa tetap kosong", () => {
    const v = fromInspection({
      id: 7,
      vehicle_id: 1,
      inspector_name: "Rina",
      has_key: true,
      status: "DRAFT",
      version: 2,
      items: [
        {
          point_code: "ENG_BAY",
          condition: "NOT_INSPECTABLE",
          note: "Tertutup",
          photo_refs: ["bay.jpg"],
        },
      ],
    });
    expect(v.items.find((i) => i.point_code === "ENG_BAY")?.note).toBe(
      "Tertutup",
    );
    expect(v.items[0].condition).toBe("");
  });
});
