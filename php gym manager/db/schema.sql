-- ============================================================
-- TABLE 1: users
-- Stores gym owners AND gym members who want portal access
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'owner',  -- 'owner' | 'member'
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE 2: gyms
-- One row per gym. Linked to owner user.
-- ============================================================
CREATE TABLE IF NOT EXISTS gyms (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id             INTEGER NOT NULL UNIQUE,
    gym_name            TEXT NOT NULL,
    owner_name          TEXT,
    owner_phone         TEXT,
    gym_address         TEXT,
    upi_id              TEXT,
    is_unlocked         INTEGER NOT NULL DEFAULT 0,
    trial_start_date    TEXT NOT NULL DEFAULT (date('now')),
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 3: gym_services
-- Owner-defined services (Weight Training, Zumba, etc.) with prices
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_services (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    gym_id      INTEGER NOT NULL,
    name        TEXT NOT NULL,
    price       REAL NOT NULL DEFAULT 0,
    duration_days INTEGER NOT NULL DEFAULT 30,
    is_active   INTEGER NOT NULL DEFAULT 1,   -- 1=active, 0=deleted
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 4: gym_settings
-- WhatsApp message templates + dead threshold config
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_settings (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    gym_id                  INTEGER NOT NULL UNIQUE,
    template_overdue        TEXT NOT NULL DEFAULT 'Sat Sri Akal {name} paaji, aapka pending due Rs.{due} hai. Please aaj counter pe clear karo.',
    template_expiring_soon  TEXT NOT NULL DEFAULT 'Sat Sri Akal {name} paaji, aapki gym membership {days} din mein expire hogi. Please renew karwa lo.',
    template_expires_today  TEXT NOT NULL DEFAULT 'Sat Sri Akal {name} paaji, aapki gym membership aaj expire ho rahi hai. Aaj hi renew karwa lo.',
    template_expired        TEXT NOT NULL DEFAULT 'Sat Sri Akal {name} paaji, aapki gym membership {days} din pehle expire ho gayi. Counter pe aa jao.',
    template_rejoin         TEXT NOT NULL DEFAULT 'Sat Sri Akal {name} paaji, bahut time ho gaya. Wapas aa jao gym. Special offer hai!',
    dead_threshold_days     INTEGER NOT NULL DEFAULT 60,
    updated_at              TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 5: members
-- Core member data. status drives all filtering logic.
-- ============================================================
CREATE TABLE IF NOT EXISTS members (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    gym_id          INTEGER NOT NULL,
    user_id         INTEGER,    -- NULL unless member has portal login
    member_name     TEXT NOT NULL,
    phone_number    TEXT NOT NULL,
    member_email    TEXT,
    service_id      INTEGER,    -- FK to gym_services
    service_name    TEXT NOT NULL,  -- denormalized for display (service may be deleted)
    monthly_fee     REAL NOT NULL DEFAULT 0,
    pending_due     REAL NOT NULL DEFAULT 0,
    start_date      TEXT NOT NULL,
    expiry_date     TEXT NOT NULL,
    joined_date     TEXT NOT NULL,  -- FIRST ever join, never changes
    last_renewed_at TEXT,
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','overdue','dead','rejoined')),
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (gym_id, phone_number),  -- DUPLICATE PREVENTION
    FOREIGN KEY (gym_id)     REFERENCES gyms(id)         ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id)        ON DELETE SET NULL,
    FOREIGN KEY (service_id) REFERENCES gym_services(id) ON DELETE SET NULL
);

-- ============================================================
-- TABLE 6: payments
-- Ledger of all cash collected. No payment gateway.
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    gym_id        INTEGER NOT NULL,
    member_id     INTEGER NOT NULL,
    amount_paid   REAL NOT NULL,
    payment_date  TEXT NOT NULL DEFAULT (date('now')),
    note          TEXT,   -- e.g. 'first payment', 'partial due', 'renewal'
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (gym_id)    REFERENCES gyms(id)     ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id)  ON DELETE CASCADE
);

-- ============================================================
-- TABLE 7: member_history
-- Tracks every status change (join, renew, dead, rejoin)
-- ============================================================
CREATE TABLE IF NOT EXISTS member_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    gym_id      INTEGER NOT NULL,
    member_id   INTEGER NOT NULL,
    event_type  TEXT NOT NULL,  -- 'joined' | 'renewed' | 'marked_dead' | 'rejoined'
    event_date  TEXT NOT NULL DEFAULT (date('now')),
    details     TEXT,   -- JSON string with extra data (e.g. '{"extended_days": 30}')
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (gym_id)    REFERENCES gyms(id)     ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id)  ON DELETE CASCADE
);

-- ============================================================
-- INDEXES (improve query speed)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_members_gym_id     ON members(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_status     ON members(gym_id, status);
CREATE INDEX IF NOT EXISTS idx_members_expiry     ON members(gym_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_members_phone      ON members(gym_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_payments_gym_date  ON payments(gym_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_history_member     ON member_history(member_id);
