export type Condition = 'GOOD' | 'MINOR_DAMAGE' | 'MAJOR_DAMAGE' | 'NOT_INSPECTABLE';
export type Item = { point_code: string; condition: Condition; note: string | null; photo_refs: string[] };
export type Vehicle = { id: number; plate_number: string; brand: string; model: string; year: number };
export type Inspection = { id: number; vehicle_id: number; inspector_name: string; has_key: boolean; status: string; version: number; items: Item[] };
export type FieldError = { field: string; reason: string };
export type Envelope<T> = { success: boolean; message: string; data: T; errors?: FieldError[] };
