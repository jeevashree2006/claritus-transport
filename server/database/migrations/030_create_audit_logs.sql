-- 030_create_audit_logs.sql
-- Audit logs module (FRD FR-CM-004): every create, change, delete, approval and status
-- change is recorded with the user, the time, the previous value and the new value.
-- Migration numbers 030-039 are reserved for the Audit logs module.
-- NEVER edit this file after it has been applied. Add a new numbered file instead.
--
-- The table is append-only: the API has no update or delete endpoint, and the triggers
-- below refuse UPDATE and DELETE so entries can't be changed even with direct SQL.
-- Requirement events are NOT copied here; the API reads them from requirement_history.

CREATE TABLE IF NOT EXISTS audit_logs (
  id           BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED     NULL,              -- NULL = system / unknown user
  user_name    VARCHAR(120)     NULL,              -- copied at write time, survives renames
  user_role    VARCHAR(30)      NULL,
  module       VARCHAR(40)      NOT NULL,          -- e.g. 'auth', 'transporters'
  action       VARCHAR(60)      NOT NULL,          -- e.g. 'sign_in', 'updated', 'bank_approved'
  summary      VARCHAR(500)     NOT NULL,          -- sentence shown in the log
  record_type  VARCHAR(60)      NULL,              -- table name, e.g. 'transporters'
  record_id    VARCHAR(60)      NULL,
  record_label VARCHAR(150)     NULL,              -- human label, e.g. transporter name
  old_values   JSON             NULL,
  new_values   JSON             NULL,
  ip_address   VARCHAR(45)      NULL,
  user_agent   VARCHAR(255)     NULL,
  created_at   TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_created (created_at),
  KEY idx_audit_logs_user (user_id, created_at),
  KEY idx_audit_logs_module (module, created_at),
  KEY idx_audit_logs_record (record_type, record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS trg_audit_logs_no_update;
CREATE TRIGGER trg_audit_logs_no_update BEFORE UPDATE ON audit_logs
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit log entries cannot be edited.';

DROP TRIGGER IF EXISTS trg_audit_logs_no_delete;
CREATE TRIGGER trg_audit_logs_no_delete BEFORE DELETE ON audit_logs
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit log entries cannot be deleted.';
