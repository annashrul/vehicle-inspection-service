import source from "../../../checklist.json";
import type { Condition } from "@/types/api";
export const POINTS = source.vehicle_types.CAR;
export const SECTIONS = source.sections as (
  "EXTERIOR" | "INTERIOR" | "ENGINE"
)[];
export type Section = (typeof SECTIONS)[number];
export const SECTION_LABELS: Record<Section, string> = {
  EXTERIOR: "Eksterior",
  INTERIOR: "Interior",
  ENGINE: "Mesin",
};
export const CONDITIONS = source.conditions as [Condition, ...Condition[]];
export const CONDITION_LABELS: Record<Condition, string> = {
  GOOD: "Baik",
  MINOR_DAMAGE: "Kerusakan ringan",
  MAJOR_DAMAGE: "Kerusakan besar",
  NOT_INSPECTABLE: "Tidak dapat diperiksa",
};
