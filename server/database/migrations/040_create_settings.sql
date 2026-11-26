-- 040_create_settings.sql
-- Settings module ("Configure, do not hardcode"): admin-editable business rules.
-- Migration numbers 040-049 are reserved for the Settings module.
-- NEVER edit this file after it has been applied. Add a new numbered file instead.
--
-- Defaults live in code (server/src/modules/settings/settings.definitions.js).
-- A row exists only for a setting an admin has changed; "Reset section to defaults"
-- deletes the section's rows. Every save and reset is also written to audit_logs, which is
-- where the page reads "Last changed by ... on ..." from (so it survives a reset).

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key  VARCHAR(100)  NOT NULL,           -- e.g. 'trips.delayThresholdMinutes'
  section      VARCHAR(40)   NOT NULL,           -- e.g. 'trips' (tab on the Settings page)
  value_json   JSON          NOT NULL,           -- the value in force
  updated_by   INT UNSIGNED  NULL,
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key),
  KEY idx_app_settings_section (section),
  CONSTRAINT fk_app_settings_user FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
