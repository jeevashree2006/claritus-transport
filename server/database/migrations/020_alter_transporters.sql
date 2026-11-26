-- 020_alter_transporters.sql
-- Transporters module: extends the shared `transporters` table created in
-- 011_create_requirement_flow.sql. No new tables - columns only.
-- Migration numbers 020-029 are reserved for the Transporters module.
-- NEVER edit this file after it has been applied. Add a new numbered file instead.
--
--  * regular_routes       FRD FR-TR-004 (optional, free text, e.g. "Chennai - Bengaluru, Hosur - Pune")
--  * bank_status + pending_* columns
--                         FRD FR-TR-007: new or changed bank details wait for a second person's approval
--                         before they replace the live account_holder / bank_name / account_number / ifsc
--                         columns that payments use. The requester can't approve their own change (FR-CM-005).

ALTER TABLE transporters
  ADD COLUMN regular_routes          VARCHAR(500)  NULL AFTER address,
  ADD COLUMN bank_status             ENUM('none','pending','approved','rejected') NOT NULL DEFAULT 'none' AFTER ifsc,
  ADD COLUMN pending_account_holder  VARCHAR(150)  NULL AFTER bank_status,
  ADD COLUMN pending_bank_name       VARCHAR(120)  NULL AFTER pending_account_holder,
  ADD COLUMN pending_account_number  VARCHAR(30)   NULL AFTER pending_bank_name,
  ADD COLUMN pending_ifsc            VARCHAR(11)   NULL AFTER pending_account_number,
  ADD COLUMN bank_requested_by       INT UNSIGNED  NULL AFTER pending_ifsc,
  ADD COLUMN bank_requested_at       DATETIME      NULL AFTER bank_requested_by,
  ADD COLUMN bank_reviewed_by        INT UNSIGNED  NULL AFTER bank_requested_at,
  ADD COLUMN bank_reviewed_at        DATETIME      NULL AFTER bank_reviewed_by,
  ADD COLUMN bank_review_note        VARCHAR(300)  NULL AFTER bank_reviewed_at,
  ADD COLUMN created_by              INT UNSIGNED  NULL AFTER is_active,
  ADD KEY idx_transporters_active (is_active),
  ADD KEY idx_transporters_bank_status (bank_status),
  ADD CONSTRAINT fk_transporters_bank_req    FOREIGN KEY (bank_requested_by) REFERENCES users (id),
  ADD CONSTRAINT fk_transporters_bank_rev    FOREIGN KEY (bank_reviewed_by)  REFERENCES users (id),
  ADD CONSTRAINT fk_transporters_created_by  FOREIGN KEY (created_by)        REFERENCES users (id);

-- Rows that already have live bank details (none in the seed today) count as approved.
UPDATE transporters SET bank_status = 'approved' WHERE account_number IS NOT NULL AND bank_status = 'none';
