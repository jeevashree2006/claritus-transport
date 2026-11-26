-- 010_create_requirements.sql
-- Requirements module, step 1: requirement record, its history, and the
-- lookup lists it needs (locations, vehicle types).
-- Migration numbers 010-019 are reserved for the Requirements module.
-- NEVER edit this file after it has been applied. Add a new numbered file instead.

-- ---------------------------------------------------------------------------
-- Lookups (shared masters; other modules may reuse them, do not recreate them)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  name        VARCHAR(120)   NOT NULL,
  state       VARCHAR(80)    NULL,
  latitude    DECIMAL(9,6)   NOT NULL,   -- used to estimate distance until a routing service is chosen
  longitude   DECIMAL(9,6)   NOT NULL,
  is_active   TINYINT(1)     NOT NULL DEFAULT 1,
  created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_locations_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicle_types (
  id               INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  name             VARCHAR(80)    NOT NULL,
  capacity_tonnes  DECIMAL(6,2)   NOT NULL,
  sort_order       SMALLINT       NOT NULL DEFAULT 0,
  is_active        TINYINT(1)     NOT NULL DEFAULT 1,
  created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vehicle_types_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO locations (name, state, latitude, longitude) VALUES
  ('Chennai',        'Tamil Nadu',      13.082700, 80.270700),
  ('Bengaluru',      'Karnataka',       12.971600, 77.594600),
  ('Hosur',          'Tamil Nadu',      12.740900, 77.825300),
  ('Coimbatore',     'Tamil Nadu',      11.016800, 76.955800),
  ('Madurai',        'Tamil Nadu',       9.925200, 78.119800),
  ('Kochi',          'Kerala',           9.931200, 76.267300),
  ('Hyderabad',      'Telangana',       17.385000, 78.486700),
  ('Visakhapatnam',  'Andhra Pradesh',  17.686800, 83.218500),
  ('Mumbai',         'Maharashtra',     19.076000, 72.877700),
  ('Pune',           'Maharashtra',     18.520400, 73.856700);

INSERT IGNORE INTO vehicle_types (name, capacity_tonnes, sort_order) VALUES
  ('LCV 14 ft',               4.00, 10),
  ('Truck 17 ft',             7.00, 20),
  ('Truck 19 ft',             9.00, 30),
  ('32 ft single axle',      15.00, 40),
  ('32 ft multi axle',       20.00, 50);

-- ---------------------------------------------------------------------------
-- Requirements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requirements (
  id                INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  requirement_no    VARCHAR(20)       NULL,             -- REQ-0001, set right after insert
  sales_order_ref   VARCHAR(60)       NULL,
  from_location_id  INT UNSIGNED      NOT NULL,
  to_location_id    INT UNSIGNED      NOT NULL,
  distance_km       INT UNSIGNED      NOT NULL,         -- estimated at creation
  material          VARCHAR(200)      NOT NULL,
  quantity_tonnes   DECIMAL(8,2)      NOT NULL,
  vehicle_type_id   INT UNSIGNED      NOT NULL,
  loading_date      DATE              NOT NULL,
  delivery_date     DATE              NULL,
  current_stage     TINYINT UNSIGNED  NOT NULL DEFAULT 2, -- 1..8, see requirements.stages.js; 2 = Enquiry is next
  status            ENUM('open','closed','cancelled') NOT NULL DEFAULT 'open',
  coordinator_id    INT UNSIGNED      NULL,
  created_by        INT UNSIGNED      NOT NULL,
  created_at        TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_requirements_no (requirement_no),
  KEY idx_requirements_status (status),
  KEY idx_requirements_stage (current_stage),
  KEY idx_requirements_route (from_location_id, to_location_id),
  CONSTRAINT fk_requirements_from    FOREIGN KEY (from_location_id) REFERENCES locations (id),
  CONSTRAINT fk_requirements_to      FOREIGN KEY (to_location_id)   REFERENCES locations (id),
  CONSTRAINT fk_requirements_vehicle FOREIGN KEY (vehicle_type_id)  REFERENCES vehicle_types (id),
  CONSTRAINT fk_requirements_coord   FOREIGN KEY (coordinator_id)   REFERENCES users (id),
  CONSTRAINT fk_requirements_creator FOREIGN KEY (created_by)       REFERENCES users (id),
  CONSTRAINT chk_requirements_route  CHECK (from_location_id <> to_location_id),
  CONSTRAINT chk_requirements_qty    CHECK (quantity_tonnes > 0),
  CONSTRAINT chk_requirements_stage  CHECK (current_stage BETWEEN 1 AND 9)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Timeline of everything that happens to a requirement (newest first in the UI).
CREATE TABLE IF NOT EXISTS requirement_history (
  id              INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  requirement_id  INT UNSIGNED      NOT NULL,
  stage           TINYINT UNSIGNED  NOT NULL,
  action          VARCHAR(40)       NOT NULL,   -- e.g. 'created', 'enquiry_sent'
  message         VARCHAR(500)      NOT NULL,
  created_by      INT UNSIGNED      NULL,
  created_at      TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_requirement_history_req (requirement_id, created_at),
  CONSTRAINT fk_requirement_history_req  FOREIGN KEY (requirement_id) REFERENCES requirements (id) ON DELETE CASCADE,
  CONSTRAINT fk_requirement_history_user FOREIGN KEY (created_by)     REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
