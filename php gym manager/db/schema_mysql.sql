-- Run this on production MySQL. Differences from SQLite schema:
-- 1. AUTOINCREMENT -> AUTO_INCREMENT
-- 2. datetime('now') -> NOW()
-- 3. date('now') -> CURDATE()
-- 4. TEXT for dates -> DATETIME / DATE types
-- 5. INTEGER for booleans -> TINYINT(1)
-- 6. Add ENGINE=InnoDB CHARSET=utf8mb4

CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        ENUM('owner','member') NOT NULL DEFAULT 'owner',
    created_at  DATETIME NOT NULL DEFAULT NOW()
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gyms (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT NOT NULL UNIQUE,
    gym_name            VARCHAR(255) NOT NULL,
    owner_name          VARCHAR(255),
    owner_phone         VARCHAR(20),
    gym_address         TEXT,
    upi_id              VARCHAR(100),
    trial_start_date    DATE NOT NULL DEFAULT (CURDATE()),
    created_at          DATETIME NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gym_services (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    gym_id      INT NOT NULL,
    name        VARCHAR(100) NOT NULL,
    price       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT NOW(),
    FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gym_settings (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    gym_id                  INT NOT NULL UNIQUE,
    template_overdue        TEXT NOT NULL,
    template_expiring_soon  TEXT NOT NULL,
    template_expires_today  TEXT NOT NULL,
    template_expired        TEXT NOT NULL,
    template_rejoin         TEXT NOT NULL,
    dead_threshold_days     INT NOT NULL DEFAULT 60,
    updated_at              DATETIME NOT NULL DEFAULT NOW(),
    FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS members (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    gym_id          INT NOT NULL,
    user_id         INT,
    member_name     VARCHAR(255) NOT NULL,
    phone_number    VARCHAR(20) NOT NULL,
    member_email    VARCHAR(255),
    service_id      INT,
    service_name    VARCHAR(100) NOT NULL,
    monthly_fee     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    pending_due     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    start_date      DATE NOT NULL,
    expiry_date     DATE NOT NULL,
    joined_date     DATE NOT NULL,
    last_renewed_at DATE,
    status          ENUM('active','overdue','dead','rejoined') NOT NULL DEFAULT 'active',
    notes           TEXT,
    created_at      DATETIME NOT NULL DEFAULT NOW(),
    updated_at      DATETIME NOT NULL DEFAULT NOW(),
    UNIQUE KEY unique_member_phone (gym_id, phone_number),
    FOREIGN KEY (gym_id)     REFERENCES gyms(id)         ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id)        ON DELETE SET NULL,
    FOREIGN KEY (service_id) REFERENCES gym_services(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    gym_id        INT NOT NULL,
    member_id     INT NOT NULL,
    amount_paid   DECIMAL(10,2) NOT NULL,
    payment_date  DATE NOT NULL DEFAULT (CURDATE()),
    note          VARCHAR(255),
    created_at    DATETIME NOT NULL DEFAULT NOW(),
    FOREIGN KEY (gym_id)    REFERENCES gyms(id)     ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id)  ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS member_history (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    gym_id      INT NOT NULL,
    member_id   INT NOT NULL,
    event_type  ENUM('joined','renewed','marked_dead','rejoined') NOT NULL,
    event_date  DATE NOT NULL DEFAULT (CURDATE()),
    details     JSON,
    created_at  DATETIME NOT NULL DEFAULT NOW(),
    FOREIGN KEY (gym_id)    REFERENCES gyms(id)     ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id)  ON DELETE CASCADE
) ENGINE=InnoDB CHARSET=utf8mb4;

CREATE INDEX idx_members_gym_id    ON members(gym_id);
CREATE INDEX idx_members_status    ON members(gym_id, status);
CREATE INDEX idx_members_expiry    ON members(gym_id, expiry_date);
CREATE INDEX idx_members_phone     ON members(gym_id, phone_number);
CREATE INDEX idx_payments_gym_date ON payments(gym_id, payment_date);
CREATE INDEX idx_history_member    ON member_history(member_id);
