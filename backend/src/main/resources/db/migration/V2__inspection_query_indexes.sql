-- IF NOT EXISTS supports applying this same DDL to a running baseline instance
-- for a fair same-JVM comparison before Flyway records V2 on the next startup.
CREATE INDEX IF NOT EXISTS idx_inspections_status_updated
 ON inspections (status, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_updated
 ON inspections (updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle_updated
 ON inspections (vehicle_id, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle_status_updated
 ON inspections (vehicle_id, status, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_outbox_pending
 ON audit_outbox (created_at, id) WHERE delivered_at IS NULL;
