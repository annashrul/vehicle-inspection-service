CREATE TABLE vehicles (
 id bigint PRIMARY KEY, plate_number varchar(30) NOT NULL UNIQUE,
 type varchar(20) NOT NULL CHECK (type = 'CAR'), brand varchar(80) NOT NULL,
 model varchar(80) NOT NULL, year integer NOT NULL
);
CREATE SEQUENCE inspections_seq START WITH 1 INCREMENT BY 1;
CREATE TABLE inspections (
 id bigint PRIMARY KEY DEFAULT nextval('inspections_seq'), vehicle_id bigint NOT NULL REFERENCES vehicles(id),
 client_id uuid UNIQUE, inspector_name varchar(200) NOT NULL CHECK (length(trim(inspector_name)) > 0),
 has_key boolean NOT NULL, status varchar(20) NOT NULL CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','RECHECK')),
 version integer NOT NULL CHECK (version >= 1), created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE TABLE inspection_items (
 inspection_id bigint NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
 point_code varchar(60) NOT NULL CHECK (point_code IN ('EXT_FRONT','EXT_FRONT_RIGHT','EXT_REAR_RIGHT','EXT_REAR','EXT_REAR_LEFT','EXT_FRONT_LEFT','EXT_ROOF','INT_DRIVER_AREA','INT_FRONT_PASSENGER','INT_REAR_DRIVER_SIDE','INT_REAR_PASSENGER_SIDE','INT_TRUNK','ENG_STARTUP','ENG_BAY')),
 item_condition varchar(30) NOT NULL CHECK (item_condition IN ('GOOD','MINOR_DAMAGE','MAJOR_DAMAGE','NOT_INSPECTABLE')),
 note text, photo_refs jsonb NOT NULL DEFAULT '[]', PRIMARY KEY (inspection_id, point_code),
 CHECK (item_condition <> 'NOT_INSPECTABLE' OR length(trim(note)) > 0 AND note IS NOT NULL),
 CHECK (jsonb_typeof(photo_refs) = 'array'),
 CHECK (item_condition <> 'MAJOR_DAMAGE' OR jsonb_array_length(photo_refs) > 0)
);
CREATE TABLE audit_outbox (
 id uuid PRIMARY KEY, inspection_id bigint REFERENCES inspections(id), payload text NOT NULL,
 created_at timestamptz NOT NULL, delivered_at timestamptz
);
INSERT INTO vehicles(id, plate_number, type, brand, model, year)
SELECT n, 'B ' || (1000+n) || ' LQ', 'CAR',
 CASE WHEN n % 2 = 0 THEN 'Toyota' ELSE 'Honda' END,
 CASE WHEN n % 2 = 0 THEN 'Avanza' ELSE 'Brio' END, 2020 + (n % 5)
FROM generate_series(1,20) AS n;
