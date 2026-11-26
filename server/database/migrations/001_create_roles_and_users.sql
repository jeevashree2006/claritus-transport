-- 001_create_roles_and_users.sql
-- Roles and users for login and role-based access.
-- NEVER edit this file after it has been applied. Add a new numbered file instead.

CREATE TABLE IF NOT EXISTS roles (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  code        VARCHAR(30)   NOT NULL,              -- 'admin', 'md'
  name        VARCHAR(100)  NOT NULL,              -- 'Administrator', 'Managing Director'
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name           VARCHAR(120)  NOT NULL,
  username       VARCHAR(60)   NOT NULL,           -- stored in lower case, compared case-insensitively
  email          VARCHAR(190)  NULL,
  password_hash  VARCHAR(255)  NOT NULL,           -- bcrypt hash, never the plain password
  role_id        INT UNSIGNED  NOT NULL,
  is_active      TINYINT(1)    NOT NULL DEFAULT 1,
  last_login_at  DATETIME      NULL,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_id (role_id),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
