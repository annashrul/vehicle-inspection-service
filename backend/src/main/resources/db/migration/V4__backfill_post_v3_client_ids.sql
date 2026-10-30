-- E2 in older builds could still create NULL client_id after V3 had run.
-- Preserve existing UUIDs while preparing those records for offline updates.
UPDATE inspections SET client_id = gen_random_uuid() WHERE client_id IS NULL;
