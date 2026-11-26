-- 011_create_requirement_flow.sql
-- Requirements module, stages 2-8: enquiry, quotations, rate approval, booking,
-- trip milestones, delivery (POD and damage) and payment.
-- Also creates the shared `transporters` master (FRD FR-TR-001..004). The Transporters
-- module should reuse and extend this table (ALTER TABLE), not create another one.
-- NEVER edit this file after it has been applied. Add a new numbered file instead.

-- ---------------------------------------------------------------------------
-- Transporters (shared master)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transporters (
  id               INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  name             VARCHAR(150)   NOT NULL,          -- company name
  contact_person   VARCHAR(120)   NOT NULL,
  mobile           VARCHAR(15)    NOT NULL,
  whatsapp         VARCHAR(15)    NOT NULL,
  city             VARCHAR(80)    NULL,
  address          VARCHAR(255)   NULL,
  account_holder   VARCHAR(150)   NULL,
  bank_name        VARCHAR(120)   NULL,
  account_number   VARCHAR(30)    NULL,
  ifsc             VARCHAR(11)    NULL,
  is_active        TINYINT(1)     NOT NULL DEFAULT 1,
  created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_transporters_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO transporters (name, contact_person, mobile, whatsapp, city) VALUES
  ('Sri Murugan Transports',   'Murugan S',   '9840012345', '9840012345', 'Chennai'),
  ('Annai Roadlines',          'Ravi Kumar',  '9443023456', '9443023456', 'Hosur'),
  ('Vel Freight Carriers',     'Velu P',      '9894034567', '9894034567', 'Coimbatore'),
  ('Kaveri Cargo Movers',      'Suresh Gowda','9845045678', '9845045678', 'Bengaluru'),
  ('Deccan Haul Lines',        'Imran Khan',  '9849056789', '9849056789', 'Hyderabad'),
  ('Western Ghats Logistics',  'Sachin Patil','9822067890', '9822067890', 'Pune');

-- ---------------------------------------------------------------------------
-- Stage 2: enquiry - which transporters were asked
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requirement_enquiry_recipients (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  requirement_id  INT UNSIGNED  NOT NULL,
  transporter_id  INT UNSIGNED  NOT NULL,
  sent_by         INT UNSIGNED  NOT NULL,
  sent_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_enquiry_recipient (requirement_id, transporter_id),
  CONSTRAINT fk_enquiry_req   FOREIGN KEY (requirement_id) REFERENCES requirements (id) ON DELETE CASCADE,
  CONSTRAINT fk_enquiry_trans FOREIGN KEY (transporter_id) REFERENCES transporters (id),
  CONSTRAINT fk_enquiry_user  FOREIGN KEY (sent_by)        REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Stage 3: quotations - one per replying transporter
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requirement_quotations (
  id              INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  requirement_id  INT UNSIGNED   NOT NULL,
  transporter_id  INT UNSIGNED   NOT NULL,
  amount          DECIMAL(12,2)  NOT NULL,
  recorded_by     INT UNSIGNED   NOT NULL,
  received_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_quotation (requirement_id, transporter_id),
  CONSTRAINT fk_quote_req   FOREIGN KEY (requirement_id) REFERENCES requirements (id) ON DELETE CASCADE,
  CONSTRAINT fk_quote_trans FOREIGN KEY (transporter_id) REFERENCES transporters (id),
  CONSTRAINT fk_quote_user  FOREIGN KEY (recorded_by)    REFERENCES users (id),
  CONSTRAINT chk_quote_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Stage 4: rate approval - chosen transporter and final negotiated rate
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requirement_rate_approvals (
  requirement_id  INT UNSIGNED   NOT NULL,
  transporter_id  INT UNSIGNED   NOT NULL,
  quoted_amount   DECIMAL(12,2)  NOT NULL,
  approved_rate   DECIMAL(12,2)  NOT NULL,
  note            VARCHAR(300)   NULL,
  approved_by     INT UNSIGNED   NOT NULL,
  approved_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (requirement_id),
  KEY idx_rate_approvals_trans (transporter_id),
  CONSTRAINT fk_rate_req   FOREIGN KEY (requirement_id) REFERENCES requirements (id) ON DELETE CASCADE,
  CONSTRAINT fk_rate_trans FOREIGN KEY (transporter_id) REFERENCES transporters (id),
  CONSTRAINT fk_rate_user  FOREIGN KEY (approved_by)    REFERENCES users (id),
  CONSTRAINT chk_rate_amount CHECK (approved_rate > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Stage 5: booking - vehicle and driver
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requirement_bookings (
  requirement_id         INT UNSIGNED  NOT NULL,
  transporter_id         INT UNSIGNED  NOT NULL,
  vehicle_no             VARCHAR(15)   NOT NULL,
  driver_name            VARCHAR(120)  NOT NULL,
  driver_mobile          VARCHAR(10)   NOT NULL,
  expected_reporting_at  DATETIME      NULL,
  booked_by              INT UNSIGNED  NOT NULL,
  booked_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (requirement_id),
  KEY idx_bookings_vehicle (vehicle_no),
  CONSTRAINT fk_booking_req   FOREIGN KEY (requirement_id) REFERENCES requirements (id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_trans FOREIGN KEY (transporter_id) REFERENCES transporters (id),
  CONSTRAINT fk_booking_user  FOREIGN KEY (booked_by)      REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Stage 6: trip follow-up milestones (in order: loaded, departed, reached, unloaded)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requirement_milestones (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  requirement_id  INT UNSIGNED  NOT NULL,
  milestone       ENUM('loaded','departed','reached','unloaded') NOT NULL,
  note            VARCHAR(300)  NULL,
  recorded_by     INT UNSIGNED  NOT NULL,
  occurred_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_milestone (requirement_id, milestone),
  CONSTRAINT fk_milestone_req  FOREIGN KEY (requirement_id) REFERENCES requirements (id) ON DELETE CASCADE,
  CONSTRAINT fk_milestone_user FOREIGN KEY (recorded_by)    REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Stage 7: delivery - POD and damage or shortage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requirement_deliveries (
  requirement_id  INT UNSIGNED   NOT NULL,
  pod_number      VARCHAR(40)    NOT NULL,
  damage_amount   DECIMAL(12,2)  NOT NULL DEFAULT 0,
  damage_note     VARCHAR(300)   NULL,
  verified_by     INT UNSIGNED   NOT NULL,
  verified_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (requirement_id),
  CONSTRAINT fk_delivery_req  FOREIGN KEY (requirement_id) REFERENCES requirements (id) ON DELETE CASCADE,
  CONSTRAINT fk_delivery_user FOREIGN KEY (verified_by)    REFERENCES users (id),
  CONSTRAINT chk_delivery_damage CHECK (damage_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Stage 8: payment (a new payment never overwrites an earlier one)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requirement_payments (
  id              INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  requirement_id  INT UNSIGNED   NOT NULL,
  payment_type    ENUM('advance','part','final') NOT NULL DEFAULT 'final',
  amount          DECIMAL(12,2)  NOT NULL,
  utr             VARCHAR(22)    NOT NULL,
  recorded_by     INT UNSIGNED   NOT NULL,
  paid_at         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payments_utr (utr),
  KEY idx_payments_req (requirement_id),
  CONSTRAINT fk_payment_req  FOREIGN KEY (requirement_id) REFERENCES requirements (id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_user FOREIGN KEY (recorded_by)    REFERENCES users (id),
  CONSTRAINT chk_payment_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
