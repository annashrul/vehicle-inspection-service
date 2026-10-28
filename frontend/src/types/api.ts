export type Condition =
  "GOOD" | "MINOR_DAMAGE" | "MAJOR_DAMAGE" | "NOT_INSPECTABLE";
export type Status = "DRAFT" | "SUBMITTED" | "RECHECK" | "APPROVED";
export type Item = {
  point_code: string;
  condition: Condition;
  note: string | null;
  photo_refs: string[];
};
export type Vehicle = {
  id: number;
  plate_number: string;
  type?: string;
  brand: string;
  model: string;
  year: number;
};
export type Inspection = {
  id: number;
  vehicle_id: number;
  client_id?: string | null;
  inspector_name: string;
  has_key: boolean;
  status: Status;
  version: number;
  items: Item[];
  updated_at?: string;
};
export type FieldError = { field: string; reason: string };
export type Envelope<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: FieldError[];
};
