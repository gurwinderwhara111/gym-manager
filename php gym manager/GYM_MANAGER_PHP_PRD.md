 # GYM MANAGER — COMPLETE PHP PRD
### Version 1.0 | Built for India Tier-2/3 Gym Owners | Punjab/Ludhiana Market
### Stack: PHP 8.2 · SQLite (Dev/Codespaces) → MySQL (Production) · Vanilla JS · No Frameworks · No Prisma

---

## ⚠️ AGENT RULES — READ BEFORE ANY CODE (MANDATORY)

These rules exist because AI agents make the same mistakes repeatedly. Every rule below maps to a real failure pattern.

1. **NEVER use `localhost` in any URL or DB path** — Codespaces uses forwarded ports. Always use relative paths and `$_SERVER['HTTP_HOST']`.
2. **NEVER hardcode SQLite file path** — use `__DIR__ . '/db/gym.db'` not `/home/user/gym.db`.
3. **NEVER mix SQLite and MySQL syntax** — use the DB abstraction layer exclusively. Never write `sqlite_*` or `mysqli_*` functions directly.
4. **NEVER use `die()` or `exit()` for errors in production paths** — use the error handler, return JSON errors to the frontend.
5. **NEVER store passwords in plain text** — always `password_hash($pass, PASSWORD_BCRYPT)` and `password_verify()`.
6. **NEVER skip CSRF tokens** — every POST form and every AJAX POST must include and validate a CSRF token.
7. **NEVER trust `$_GET`, `$_POST` without sanitization** — always use the `sanitize()` helper before any DB query.
8. **NEVER write raw SQL with string concatenation** — always use PDO prepared statements with bound parameters.
9. **NEVER skip the `gym_id` check** — every DB query on `members`, `payments`, `gym_services`, `member_history` MUST include `gym_id = ?` to prevent cross-tenant data leakage.
10. **NEVER forget to close the PHP tag on files that are pure PHP** — omit the closing `?>` to prevent accidental whitespace headers.
11. **NEVER import Prisma, Laravel, Symfony, or any ORM/framework** — this is plain PHP 8.2 + PDO only.
12. **ALWAYS check if a function already exists before creating it** — duplication causes fatal errors in PHP.
13. **ALWAYS run the SQL schema migration before testing** — DB errors are always missing tables or columns, not PHP bugs.
14. **ALWAYS set `Content-Type: application/json`** before any `echo json_encode()` call.
15. **ALWAYS use `intval()` or `floatval()` on numeric inputs** — never trust string-to-number coercion in PHP.
16. **DB SWITCH RULE** — the entire app reads DB type from one env variable: `DB_DRIVER=sqlite` or `DB_DRIVER=mysql`. No other file changes needed to switch databases.

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Rationale](#2-tech-stack--rationale)
3. [Folder Structure](#3-folder-structure)
4. [Environment Configuration](#4-environment-configuration)
5. [Database Abstraction Layer](#5-database-abstraction-layer)
6. [Database Schema — Complete](#6-database-schema--complete)
7. [Authentication System](#7-authentication-system)
8. [Test Credentials](#8-test-credentials)
9. [Phase 1 — Foundation](#9-phase-1--foundation)
10. [Phase 2 — Member Management](#10-phase-2--member-management)
11. [Phase 3 — Dashboard & Tabs](#11-phase-3--dashboard--tabs)
12. [Phase 4 — Services & Gym Settings](#12-phase-4--services--gym-settings)
13. [Phase 5 — Analytics & Charts](#13-phase-5--analytics--charts)
14. [Phase 6 — WhatsApp Templates](#14-phase-6--whatsapp-templates)
15. [Phase 7 — Member Portal](#15-phase-7--member-portal)
16. [Phase 8 — Data Export](#16-phase-8--data-export)
17. [Phase 9 — Offline Queue & Reliability](#17-phase-9--offline-queue--reliability)
18. [Phase 10 — Trial & Paywall](#18-phase-10--trial--paywall)
19. [API Endpoint Reference](#19-api-endpoint-reference)
20. [Frontend Architecture](#20-frontend-architecture)
21. [Security Checklist](#21-security-checklist)
22. [Deployment — Codespaces to Production](#22-deployment--codespaces-to-production)
23. [Common Bugs & How to Prevent Them](#23-common-bugs--how-to-prevent-them)

---

## 1. PROJECT OVERVIEW

**Product:** Gym Manager — a hyper-fast, offline-capable web app for local Indian gym owners to track member subscriptions, pending dues, and send WhatsApp reminders.

**Target User:** Gym owner in Ludhiana/Punjab, India. Uses phone more than laptop. Needs 3-second workflows. Operates in cash. Has terrible WiFi in basement. Does not trust complex software.

**Core Promise:**
- Add a member in under 10 seconds
- See who owes money in one glance
- Send WhatsApp reminder in one tap
- Never lose data even if WiFi drops
- Export all data anytime — owner owns their data

**What This App Is NOT:**
- Not a payment gateway (no Razorpay, no UPI processing)
- Not a billing system
- Not a multi-location enterprise tool
- Not an attendance tracker
- Not a diet/workout tracker

**Monetization:** ₹499/month per gym. 14-day free trial. Hard lockout on day 15 with UPI QR code.

---

## 2. TECH STACK & RATIONALE

| Layer | Technology | Why |
|---|---|---|
| Language | PHP 8.2 | Runs on every shared host in India. Zero DevOps needed. |
| Database (Dev) | SQLite 3 | Zero setup in Codespaces. One file, no server. |
| Database (Prod) | MySQL 8.0 | Standard on every Indian hosting provider (Hostinger, A2, etc.) |
| DB Access | PDO (PHP Data Objects) | Single API for both SQLite and MySQL. Swap DB by changing env only. |
| Frontend | Vanilla JS (ES6+) | No build step. Loads instantly on 4G. Owner doesn't need to install Node. |
| CSS | Plain CSS (one file) | No Tailwind compiler. No npm. Works offline. |
| Charts | Chart.js (CDN) | Lightweight. No build step. One script tag. |
| Session | PHP native sessions | No JWT complexity. No Redis needed. |
| Auth | Custom PHP session auth | Email + password. No OAuth dependencies. |
| Hosting | Any PHP host (Codespaces for dev) | InfinityFree, Hostinger, A2 all supported |
| No | Prisma, Laravel, Symfony, Composer, Node, npm, React, Tailwind | Intentionally excluded |

---

## 3. FOLDER STRUCTURE

```
gym-manager/
│
├── index.php                  # Entry point — routes all requests
├── .env                       # Environment config (NEVER commit this)
├── .env.example               # Template for .env
├── .htaccess                  # Rewrites all requests to index.php
├── .gitignore                 # Ignores .env, db/, vendor/
│
├── config/
│   ├── app.php                # App-wide constants (APP_NAME, VERSION, etc.)
│   └── db.php                 # DB connection factory — reads DB_DRIVER from .env
│
├── core/
│   ├── Database.php           # PDO abstraction class (query, fetch, fetchAll, execute)
│   ├── Auth.php               # Session-based auth (login, logout, current user, guard)
│   ├── Request.php            # Input sanitizer (get, post, file)
│   ├── Response.php           # JSON response helpers (success, error, redirect)
│   ├── CSRF.php               # CSRF token generation and validation
│   └── Helpers.php            # Utility functions (formatDate, daysLeft, etc.)
│
├── models/
│   ├── GymModel.php           # All DB queries for gyms table
│   ├── MemberModel.php        # All DB queries for members table
│   ├── PaymentModel.php       # All DB queries for payments table
│   ├── ServiceModel.php       # All DB queries for gym_services table
│   ├── SettingsModel.php      # All DB queries for gym_settings table
│   └── HistoryModel.php       # All DB queries for member_history table
│
├── controllers/
│   ├── AuthController.php     # login, logout, register
│   ├── GymController.php      # create gym, update gym settings
│   ├── MemberController.php   # add, edit, renew, mark dead, rejoin, check duplicate
│   ├── DashboardController.php# dashboard data, tab counts
│   ├── AnalyticsController.php# earnings chart, member count chart
│   ├── ServiceController.php  # CRUD for gym services
│   ├── SettingsController.php # WhatsApp templates, gym details
│   ├── ExportController.php   # CSV export
│   └── PortalController.php   # Member self-service portal
│
├── views/
│   ├── layout/
│   │   ├── header.php         # HTML head, CSS links, session check
│   │   └── footer.php         # JS includes, closing tags
│   ├── auth/
│   │   └── login.php          # Login page
│   ├── setup/
│   │   └── create_gym.php     # First-time gym setup page
│   ├── dashboard/
│   │   ├── index.php          # Main dashboard (tabs, member cards, search)
│   │   ├── add_member.php     # Add member form (embedded or modal)
│   │   └── edit_member.php    # Edit member form
│   ├── settings/
│   │   ├── index.php          # Settings page (services, templates, gym info)
│   │   ├── services.php       # Services & pricing section
│   │   └── templates.php      # WhatsApp message templates section
│   ├── analytics/
│   │   └── index.php          # Analytics page with charts
│   ├── portal/
│   │   └── index.php          # Member self-portal (read-only)
│   └── paywall/
│       └── index.php          # Trial expired screen
│
├── api/
│   ├── members.php            # AJAX endpoints for member CRUD
│   ├── services.php           # AJAX endpoints for services CRUD
│   ├── settings.php           # AJAX endpoints for settings
│   ├── analytics.php          # AJAX endpoints for chart data
│   ├── export.php             # CSV download endpoint
│   └── check_duplicate.php    # Real-time duplicate phone check
│
├── db/
│   ├── gym.db                 # SQLite DB file (auto-created, gitignored)
│   ├── schema.sql             # Full schema — runs on both SQLite and MySQL
│   ├── schema_mysql.sql       # MySQL-specific schema (for production setup)
│   ├── migrate.php            # Migration runner script
│   └── seed.php               # Seeds test gym + test users
│
├── assets/
│   ├── css/
│   │   └── app.css            # All styles in one file
│   └── js/
│       ├── app.js             # Global JS (CSRF, fetch wrapper, toast)
│       ├── dashboard.js       # Dashboard tabs, search, member card actions
│       ├── analytics.js       # Chart.js initialization and data loading
│       ├── settings.js        # Settings page interactions
│       └── offline.js         # localStorage offline queue + sync logic
│
└── scripts/
    ├── setup.sh               # One-command Codespaces setup script
    └── deploy_check.php       # Pre-deployment validation script
```

---

## 4. ENVIRONMENT CONFIGURATION

### `.env` file (Codespaces — SQLite)
```env
APP_NAME="Gym Manager"
APP_ENV=development
APP_URL=http://localhost:8000
APP_SECRET=change_this_to_random_64_char_string_in_production

# Database — SQLite for dev
DB_DRIVER=sqlite
DB_SQLITE_PATH=__DIR__/db/gym.db

# Database — MySQL for prod (leave blank in dev)
DB_HOST=
DB_PORT=3306
DB_NAME=
DB_USER=
DB_PASS=

# Trial config
TRIAL_DAYS=14

# Test credentials (dev only)
TEST_OWNER_EMAIL=owner@gymtest.com
TEST_OWNER_PASS=test1234
TEST_MEMBER_EMAIL=member@gymtest.com
TEST_MEMBER_PASS=member123
```

### `.env` file (Production — MySQL)
```env
APP_NAME="Gym Manager"
APP_ENV=production
APP_URL=https://yourdomain.com
APP_SECRET=abc123def456...  (64 random chars)

DB_DRIVER=mysql
DB_SQLITE_PATH=

DB_HOST=localhost
DB_PORT=3306
DB_NAME=gym_manager_db
DB_USER=db_username
DB_PASS=db_password

TRIAL_DAYS=14
```

### `.env.example`
```env
APP_NAME="Gym Manager"
APP_ENV=development
APP_URL=http://localhost:8000
APP_SECRET=CHANGE_THIS

DB_DRIVER=sqlite
DB_SQLITE_PATH=__DIR__/db/gym.db

DB_HOST=
DB_PORT=3306
DB_NAME=
DB_USER=
DB_PASS=

TRIAL_DAYS=14

TEST_OWNER_EMAIL=owner@gymtest.com
TEST_OWNER_PASS=test1234
TEST_MEMBER_EMAIL=member@gymtest.com
TEST_MEMBER_PASS=member123
```

### `config/db.php` — DB Connection Factory
```php
<?php
// AGENT: This file is the ONLY place that reads DB_DRIVER.
// NEVER reference SQLite or MySQL directly outside this file.

function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $driver = $_ENV['DB_DRIVER'] ?? 'sqlite';

    if ($driver === 'sqlite') {
        $path = str_replace('__DIR__', __DIR__ . '/..', $_ENV['DB_SQLITE_PATH']);
        $pdo = new PDO('sqlite:' . $path);
        $pdo->exec('PRAGMA foreign_keys = ON;');
        $pdo->exec('PRAGMA journal_mode = WAL;');
    } elseif ($driver === 'mysql') {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $_ENV['DB_HOST'],
            $_ENV['DB_PORT'] ?? 3306,
            $_ENV['DB_NAME']
        );
        $pdo = new PDO($dsn, $_ENV['DB_USER'], $_ENV['DB_PASS']);
    } else {
        throw new RuntimeException("Unknown DB_DRIVER: $driver");
    }

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return $pdo;
}
```

---

## 5. DATABASE ABSTRACTION LAYER

### `core/Database.php`
```php
<?php
// AGENT: ALL database access goes through this class.
// NEVER use getDB() directly in controllers or models — use Database::getInstance().

class Database {
    private static ?Database $instance = null;
    private PDO $pdo;

    private function __construct() {
        $this->pdo = getDB();
    }

    public static function getInstance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    // Run a query with bound params, return statement
    public function query(string $sql, array $params = []): PDOStatement {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    // Fetch one row
    public function fetch(string $sql, array $params = []): ?array {
        $result = $this->query($sql, $params)->fetch();
        return $result ?: null;
    }

    // Fetch all rows
    public function fetchAll(string $sql, array $params = []): array {
        return $this->query($sql, $params)->fetchAll();
    }

    // Execute INSERT/UPDATE/DELETE, return affected rows
    public function execute(string $sql, array $params = []): int {
        return $this->query($sql, $params)->rowCount();
    }

    // Get last inserted ID
    public function lastInsertId(): string {
        return $this->pdo->lastInsertId();
    }

    // Transaction helpers
    public function beginTransaction(): void { $this->pdo->beginTransaction(); }
    public function commit(): void { $this->pdo->commit(); }
    public function rollBack(): void { $this->pdo->rollBack(); }
}
```

---

## 6. DATABASE SCHEMA — COMPLETE

### `db/schema.sql` — Compatible with BOTH SQLite and MySQL
> AGENT NOTE: This single schema file works for both databases.
> SQLite ignores ENGINE= and CHARSET= clauses. MySQL ignores PRAGMA.
> Do NOT use AUTO_INCREMENT (MySQL only) — use INTEGER PRIMARY KEY (SQLite-compatible) or handle in migration.
> For MySQL production, use schema_mysql.sql instead.

```sql
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
    status          TEXT NOT NULL DEFAULT 'active', -- active | overdue | dead | rejoined
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
```

### `db/schema_mysql.sql` — Production MySQL Version
```sql
-- Run this on production MySQL. Differences from SQLite schema:
-- 1. AUTOINCREMENT → AUTO_INCREMENT
-- 2. datetime('now') → NOW()
-- 3. date('now') → CURDATE()
-- 4. TEXT for dates → DATETIME / DATE types
-- 5. INTEGER for booleans → TINYINT(1)
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
```

---

## 7. AUTHENTICATION SYSTEM

**Strategy:** PHP native sessions. No JWT. No tokens in URLs.

### Login Flow
1. User visits any page → `Auth::guard()` checks if session has `user_id`
2. If not logged in → redirect to `/login`
3. POST to `/api/auth/login` with email + password + CSRF token
4. Server: fetch user by email → `password_verify()` → if match, set session
5. Session stores: `user_id`, `role`, `gym_id` (null if not set up yet)
6. Redirect to `/dashboard`

### Session Variables
```php
$_SESSION['user_id']  = int      // users.id
$_SESSION['role']     = string   // 'owner' | 'member'
$_SESSION['gym_id']   = int|null // gyms.id (null until gym created)
$_SESSION['gym_name'] = string   // for display
```

### `core/Auth.php`
```php
<?php
class Auth {
    public static function start(): void {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    public static function login(int $userId, string $role, ?int $gymId, string $gymName = ''): void {
        session_regenerate_id(true); // Prevent session fixation
        $_SESSION['user_id']  = $userId;
        $_SESSION['role']     = $role;
        $_SESSION['gym_id']   = $gymId;
        $_SESSION['gym_name'] = $gymName;
    }

    public static function logout(): void {
        session_unset();
        session_destroy();
    }

    public static function user(): ?array {
        return isset($_SESSION['user_id']) ? [
            'id'       => $_SESSION['user_id'],
            'role'     => $_SESSION['role'],
            'gym_id'   => $_SESSION['gym_id'],
            'gym_name' => $_SESSION['gym_name'],
        ] : null;
    }

    public static function guard(?string $role = null): void {
        self::start();
        if (!isset($_SESSION['user_id'])) {
            header('Location: /login');
            exit;
        }
        if ($role && $_SESSION['role'] !== $role) {
            header('Location: /dashboard');
            exit;
        }
    }

    public static function gymId(): int {
        return (int)($_SESSION['gym_id'] ?? 0);
    }

    public static function isOwner(): bool {
        return ($_SESSION['role'] ?? '') === 'owner';
    }
}
```

### `core/CSRF.php`
```php
<?php
class CSRF {
    public static function token(): string {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf_token'];
    }

    public static function validate(): bool {
        $token = $_POST['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        return hash_equals($_SESSION['csrf_token'] ?? '', $token);
    }

    public static function field(): string {
        return '<input type="hidden" name="csrf_token" value="' . self::token() . '">';
    }

    public static function assertValid(): void {
        if (!self::validate()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Invalid CSRF token']);
            exit;
        }
    }
}
```

---

## 8. TEST CREDENTIALS

> These are seeded into the DB by `db/seed.php`. Use them for development and testing.

### Test Gym Owner
| Field | Value |
|---|---|
| Email | `owner@gymtest.com` |
| Password | `test1234` |
| Role | `owner` |
| Gym Name | `Brar Fitness Club` |
| Trial Status | Active (14 days) |

### Test Gym Member (Portal Access)
| Field | Value |
|---|---|
| Email | `member@gymtest.com` |
| Password | `member123` |
| Role | `member` |
| Member Name | `Gurpreet Singh` |
| Service | Weight Training |
| Status | Active |

### `db/seed.php` — Seeder Script
```php
<?php
require_once __DIR__ . '/../config/db.php';

$db = Database::getInstance();

// Owner user
$ownerPass = password_hash('test1234', PASSWORD_BCRYPT);
$db->execute(
    "INSERT OR IGNORE INTO users (email, password, role) VALUES (?, ?, 'owner')",
    ['owner@gymtest.com', $ownerPass]
);
$ownerId = $db->fetch("SELECT id FROM users WHERE email = ?", ['owner@gymtest.com'])['id'];

// Gym
$db->execute(
    "INSERT OR IGNORE INTO gyms (user_id, gym_name, owner_name, owner_phone, upi_id, trial_start_date)
     VALUES (?, 'Brar Fitness Club', 'Harpreet Brar', '9876543210', 'brar@upi', date('now'))",
    [$ownerId]
);
$gymId = $db->fetch("SELECT id FROM gyms WHERE user_id = ?", [$ownerId])['id'];

// Gym settings (defaults)
$db->execute(
    "INSERT OR IGNORE INTO gym_settings (gym_id) VALUES (?)",
    [$gymId]
);

// Default services
$services = [
    ['Weight Training', 1500],
    ['Cardio',           1000],
    ['Zumba',             800],
];
foreach ($services as [$name, $price]) {
    $db->execute(
        "INSERT OR IGNORE INTO gym_services (gym_id, name, price) VALUES (?, ?, ?)",
        [$gymId, $name, $price]
    );
}
$serviceId = $db->fetch("SELECT id FROM gym_services WHERE gym_id = ? AND name = 'Weight Training'", [$gymId])['id'];

// Test member user (for portal)
$memberPass = password_hash('member123', PASSWORD_BCRYPT);
$db->execute(
    "INSERT OR IGNORE INTO users (email, password, role) VALUES (?, ?, 'member')",
    ['member@gymtest.com', $memberPass]
);
$memberId = $db->fetch("SELECT id FROM users WHERE email = ?", ['member@gymtest.com'])['id'];

// Test member
$today    = date('Y-m-d');
$expiry   = date('Y-m-d', strtotime('+25 days'));
$db->execute(
    "INSERT OR IGNORE INTO members (gym_id, user_id, member_name, phone_number, member_email,
     service_id, service_name, monthly_fee, pending_due, start_date, expiry_date, joined_date, status)
     VALUES (?, ?, 'Gurpreet Singh', '9988776655', 'member@gymtest.com', ?, 'Weight Training', 1500, 200, ?, ?, ?, 'active')",
    [$gymId, $memberId, $serviceId, $today, $expiry, $today]
);

// A few more dummy members
$dummies = [
    ['Sukhdev Kumar',  '9876501234', 'Weight Training', 1500, 0,   '+5 days',  'active'],
    ['Manpreet Kaur',  '9876502345', 'Zumba',            800, 800, '-2 days',  'overdue'],
    ['Rajinder Singh', '9876503456', 'Cardio',           1000, 500, '-70 days', 'dead'],
    ['Amrit Gill',     '9876504567', 'Weight Training', 1500, 0,   '+28 days', 'active'],
];
foreach ($dummies as [$name, $phone, $svcName, $fee, $due, $offset, $status]) {
    $svc = $db->fetch("SELECT id FROM gym_services WHERE gym_id = ? AND name = ?", [$gymId, $svcName]);
    $exp = date('Y-m-d', strtotime($offset));
    $db->execute(
        "INSERT OR IGNORE INTO members (gym_id, member_name, phone_number, service_name, monthly_fee,
         pending_due, start_date, expiry_date, joined_date, status)
         VALUES (?, ?, ?, ?, ?, ?, date('now'), ?, date('now','-30 days'), ?)",
        [$gymId, $name, $phone, $svcName, $fee, $due, $exp, $status]
    );
}

echo "Seed complete.\n";
echo "Owner login:  owner@gymtest.com / test1234\n";
echo "Member login: member@gymtest.com / member123\n";
```

---

## 9. PHASE 1 — FOUNDATION

**Goal:** PHP app boots, DB connects, login works, gym can be created.

**Deliverables:**
- `.htaccess` routing all requests to `index.php`
- `index.php` router (maps URL paths to controllers)
- `.env` loading (no Composer — use a simple `parse_ini_file()` loader)
- `core/Database.php` working for both SQLite and MySQL
- `core/Auth.php`, `core/CSRF.php`, `core/Request.php`, `core/Response.php`
- `db/schema.sql` migration runs cleanly
- `db/seed.php` populates test data
- Login page renders, form submits, session created
- Auth guard redirects unauthenticated requests
- Gym creation form works
- Default gym_settings and services seeded on gym creation

### `.htaccess`
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.php [QSA,L]
```

### `index.php` — Router
```php
<?php
// AGENT: This is the ONLY entry point. All URLs route through here.
// Add new routes in the match() block. Never create separate entry PHP files.

require_once __DIR__ . '/config/app.php';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/core/Database.php';
require_once __DIR__ . '/core/Auth.php';
require_once __DIR__ . '/core/CSRF.php';
require_once __DIR__ . '/core/Request.php';
require_once __DIR__ . '/core/Response.php';
require_once __DIR__ . '/core/Helpers.php';

// Load all models
foreach (glob(__DIR__ . '/models/*.php') as $model) require_once $model;
// Load all controllers
foreach (glob(__DIR__ . '/controllers/*.php') as $ctrl) require_once $ctrl;

Auth::start();

$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

match(true) {
    // Auth routes
    $uri === '/login'  && $method === 'GET'  => (new AuthController)->showLogin(),
    $uri === '/login'  && $method === 'POST' => (new AuthController)->login(),
    $uri === '/logout' && $method === 'POST' => (new AuthController)->logout(),
    $uri === '/register' && $method === 'GET'  => (new AuthController)->showRegister(),
    $uri === '/register' && $method === 'POST' => (new AuthController)->register(),

    // Setup
    $uri === '/setup'  && $method === 'GET'  => (new GymController)->showSetup(),
    $uri === '/setup'  && $method === 'POST' => (new GymController)->createGym(),

    // Dashboard
    $uri === '/'        => (new DashboardController)->index(),
    $uri === '/dashboard' => (new DashboardController)->index(),

    // Members (API)
    $uri === '/api/members'            && $method === 'GET'    => (new MemberController)->list(),
    $uri === '/api/members'            && $method === 'POST'   => (new MemberController)->add(),
    $uri === '/api/members/edit'       && $method === 'POST'   => (new MemberController)->edit(),
    $uri === '/api/members/renew'      && $method === 'POST'   => (new MemberController)->renew(),
    $uri === '/api/members/mark-dead'  && $method === 'POST'   => (new MemberController)->markDead(),
    $uri === '/api/members/rejoin'     && $method === 'POST'   => (new MemberController)->rejoin(),
    $uri === '/api/members/check-duplicate' && $method === 'GET' => (new MemberController)->checkDuplicate(),

    // Services (API)
    $uri === '/api/services'           && $method === 'GET'    => (new ServiceController)->list(),
    $uri === '/api/services'           && $method === 'POST'   => (new ServiceController)->add(),
    $uri === '/api/services/edit'      && $method === 'POST'   => (new ServiceController)->edit(),
    $uri === '/api/services/delete'    && $method === 'POST'   => (new ServiceController)->delete(),

    // Settings (API)
    $uri === '/api/settings'           && $method === 'GET'    => (new SettingsController)->get(),
    $uri === '/api/settings'           && $method === 'POST'   => (new SettingsController)->save(),

    // Analytics (API)
    $uri === '/api/analytics'          && $method === 'GET'    => (new AnalyticsController)->getData(),

    // Export
    $uri === '/export/members'         && $method === 'GET'    => (new ExportController)->members(),
    $uri === '/export/payments'        && $method === 'GET'    => (new ExportController)->payments(),

    // Settings page
    $uri === '/settings'               && $method === 'GET'    => (new SettingsController)->showPage(),

    // Analytics page
    $uri === '/analytics'              && $method === 'GET'    => (new AnalyticsController)->showPage(),

    // Member portal
    $uri === '/portal'                 && $method === 'GET'    => (new PortalController)->index(),

    default => (function() {
        http_response_code(404);
        echo '404 Not Found';
    })()
};
```

### `config/app.php`
```php
<?php
// AGENT: Load .env FIRST before anything else. Use this file as the bootstrap.

$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
        [$key, $val] = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($val);
    }
}

define('APP_NAME',   $_ENV['APP_NAME']   ?? 'Gym Manager');
define('APP_ENV',    $_ENV['APP_ENV']    ?? 'development');
define('APP_SECRET', $_ENV['APP_SECRET'] ?? 'changeme');
define('TRIAL_DAYS', (int)($_ENV['TRIAL_DAYS'] ?? 14));
```

---

## 10. PHASE 2 — MEMBER MANAGEMENT

**Goal:** Full CRUD for members with duplicate prevention, status system, rejoin flow.

### `models/MemberModel.php`

**Methods (every method MUST include gym_id in WHERE clause):**

```
getAllByGym(int $gymId, string $status = 'all', string $search = ''): array
    - Returns members filtered by status and optional search (name OR phone)
    - Runs auto-dead logic: if expiry_date < (today - dead_threshold_days) AND status != 'dead' → UPDATE status = 'dead'
    - Orders: active first (by expiry ASC), then overdue, then dead

getById(int $id, int $gymId): ?array
    - ALWAYS include gym_id to prevent cross-tenant access

findByPhone(string $phone, int $gymId): ?array
    - Used for duplicate check
    - Returns member row if found

add(array $data): int
    - INSERT into members
    - Returns new member ID

edit(int $id, int $gymId, array $data): bool
    - UPDATE with gym_id in WHERE

renew(int $id, int $gymId, int $months): bool
    - Calculates new expiry: max(today, current expiry) + (months * 30) days
    - Sets status = 'active'
    - Updates last_renewed_at = today

markDead(int $id, int $gymId): bool
    - Sets status = 'dead'

rejoin(int $id, int $gymId, array $data): bool
    - Sets status = 'rejoined'
    - Updates start_date, expiry_date, monthly_fee
    - Sets joined_date ONLY if null (never overwrite original join date)

countsByStatus(int $gymId): array
    - Returns ['active'=>N, 'overdue'=>N, 'dead'=>N, 'all'=>N]
    - Used for tab badges
```

### `controllers/MemberController.php`

**`add()` method — full flow:**
```
1. Auth::guard('owner')
2. CSRF::assertValid()
3. Get inputs: name, phone, service_id, monthly_fee, amount_paid, start_date
4. Sanitize all inputs
5. Validate: name not empty, phone exactly 10 digits (strip non-numeric first)
6. Check duplicate: MemberModel::findByPhone(phone, gymId)
   - If found AND status = 'dead':
       Return JSON: {success:false, duplicate:true, canRejoin:true, memberId: X, name: Y}
   - If found AND status != 'dead':
       Return JSON: {success:false, duplicate:true, canRejoin:false, error: 'Member already exists'}
7. Get service: ServiceModel::getById(service_id, gymId) — validate it belongs to this gym
8. Calculate: expiry = start_date + 30 days, pending_due = max(0, fee - paid)
9. INSERT into members
10. If amount_paid > 0: INSERT into payments (note: 'first_payment')
11. INSERT into member_history (event_type: 'joined')
12. Return JSON: {success: true, message: 'Member added', member: {...}}
```

**`rejoin()` method — full flow:**
```
1. Auth::guard('owner')
2. CSRF::assertValid()
3. Get member_id, new start_date, new service_id, new monthly_fee
4. Verify member belongs to this gym (gym_id check)
5. Verify member status is 'dead' (reject if not)
6. Fetch current member data
7. Update: status='rejoined', start_date, expiry_date=(start + 30d),
           service_id, service_name, monthly_fee, pending_due=0,
           last_renewed_at=today
   Do NOT update joined_date (preserve original)
8. INSERT into member_history (event_type: 'rejoined', details: JSON)
9. Return JSON: {success: true, message: 'Member rejoined'}
```

**`checkDuplicate()` method:**
```
1. Auth::guard('owner')
2. GET param: phone
3. Strip non-numeric from phone
4. Query: MemberModel::findByPhone(phone, gymId)
5. Return: {found: bool, status: string|null, name: string|null, canRejoin: bool}
```

### Auto-Dead Logic (runs in `getAllByGym`)
```php
// AGENT: This runs in PHP, not a cron. No server scheduler needed.
// After fetching all members, batch-update dead status in one query.

$threshold = $settings['dead_threshold_days'] ?? 60;
$deadCutoff = date('Y-m-d', strtotime("-{$threshold} days"));

$db->execute(
    "UPDATE members
     SET status = 'overdue', updated_at = datetime('now')
     WHERE gym_id = ? AND status = 'active' AND expiry_date < date('now')",
    [$gymId]
);

$db->execute(
    "UPDATE members
     SET status = 'dead', updated_at = datetime('now')
     WHERE gym_id = ? AND status IN ('active','overdue') AND expiry_date < ?",
    [$gymId, $deadCutoff]
);
```

---

## 11. PHASE 3 — DASHBOARD & TABS

**Goal:** Dashboard loads fast, tabs filter correctly, search works, member cards show all actions.

### Dashboard Page Structure
```
[Cash Flow Header]      ← Monthly collections ₹X (green banner)
[Search Bar]            ← Filters all tabs simultaneously
[Tab Group]             ← Running | Overdue | All | Dead  (with counts)
[Member Cards List]     ← Filtered by active tab + search
[Add Member Button]     ← Fixed bottom button → opens Add Member slide-up
```

### Tab Logic
| Tab | SQL Filter |
|---|---|
| Running | `status = 'active' AND expiry_date >= date('now')` |
| Overdue | `status IN ('active','overdue') AND (expiry_date < date('now') OR pending_due > 0)` |
| All | No status filter |
| Dead | `status = 'dead'` |

### Member Card — Fields & Actions

**Active member card:**
```
[Name]               [Service Tag]
[Expires in X days]
                     [WhatsApp ⬤] [Edit ✎] [+Renew] [Mark Dead]
```

**Overdue member card:**
```
[Name]               [Service Tag]  [OVERDUE badge]
[Expired X days ago] [Udhaar: ₹X]
                     [WhatsApp ⬤] [Edit ✎] [+Renew] [Clear Due ₹___]
```

**Dead member card:**
```
[Name]               [Service Tag]  [DEAD badge]
[Last active: DD/MM/YYYY]
                     [WhatsApp ⬤] [Rejoin 🔄]
```

### `controllers/DashboardController.php` — `index()` method
```
1. Auth::guard('owner')
2. Check if gym exists → if not, redirect to /setup
3. Check trial: compute days since trial_start_date
   - If expired → redirect to paywall view (render views/paywall/index.php)
4. Run auto-dead update (MemberModel::runAutoDeadUpdate)
5. Load tab counts: MemberModel::countsByStatus(gymId)
6. Load monthly collections: PaymentModel::getMonthlyTotal(gymId)
7. Load services list: ServiceModel::getActive(gymId) — for Add Member form dropdown
8. Load gym settings: SettingsModel::get(gymId) — for WhatsApp templates
9. Render views/dashboard/index.php with all data
```

### Search Implementation (Server-side)
```
GET /api/members?tab=running&search=gurpreet&page=1

PHP:
1. Auth::guard('owner')
2. $tab = sanitize($_GET['tab']) — validate is one of: running|overdue|all|dead
3. $search = sanitize($_GET['search']) — max 100 chars
4. $members = MemberModel::getAllByGym(gymId, tab, search)
5. For each member: attach WhatsApp link (built from settings templates)
6. Return JSON: {members: [...], total: N}
```

---

## 12. PHASE 4 — SERVICES & GYM SETTINGS

**Goal:** Gym owner can define their own services and prices, and edit gym account details.

### Services Management

**Add service:**
```
POST /api/services
Body: {name, price, csrf_token}

Validate: name not empty, price >= 0
Check: no duplicate name in same gym (case-insensitive)
INSERT into gym_services
Return: {success: true, service: {id, name, price}}
```

**Edit service:**
```
POST /api/services/edit
Body: {id, name, price, csrf_token}

Validate service belongs to this gym (gym_id check)
UPDATE gym_services SET name=?, price=? WHERE id=? AND gym_id=?
Return: {success: true}
```

**Delete service:**
```
POST /api/services/delete
Body: {id, csrf_token}

Check: no active members using this service
  SELECT COUNT(*) FROM members WHERE service_id=? AND gym_id=? AND status='active'
  If count > 0: return {success:false, error:'Cannot delete — X active members use this service'}
Soft delete: UPDATE gym_services SET is_active=0
Return: {success: true}
```

### Gym Settings Management

**Settings page sections:**
1. **Gym Info** — gym_name, owner_name, owner_phone, gym_address, upi_id
2. **Services & Pricing** — CRUD table
3. **WhatsApp Templates** — 5 template textareas with variable hints
4. **Dead Client Threshold** — number input (default 60 days)
5. **Data Export** — two download buttons

**Save settings:**
```
POST /api/settings
Body: {gym_name, owner_name, owner_phone, gym_address, upi_id,
       template_overdue, template_expiring_soon, template_expires_today,
       template_expired, template_rejoin, dead_threshold_days, csrf_token}

UPDATE gyms SET ... WHERE id=? AND user_id=?
UPDATE/INSERT gym_settings WHERE gym_id=?
Return: {success: true, message: 'Settings saved'}
```

---

## 13. PHASE 5 — ANALYTICS & CHARTS

**Goal:** Owner sees key numbers and trends at a glance.

### `GET /api/analytics` Response Structure
```json
{
  "stats": {
    "total_active": 45,
    "total_overdue": 8,
    "total_dead": 12,
    "new_joins_this_month": 6,
    "renewals_this_month": 14,
    "this_month_collection": 48500
  },
  "monthly_collections": [
    {"month": "Dec 2025", "total": 42000},
    {"month": "Jan 2026", "total": 38500},
    {"month": "Feb 2026", "total": 45000},
    {"month": "Mar 2026", "total": 51000},
    {"month": "Apr 2026", "total": 48000},
    {"month": "May 2026", "total": 48500}
  ],
  "member_count_trend": [
    {"month": "Dec 2025", "count": 38},
    {"month": "Jan 2026", "count": 41},
    {"month": "Feb 2026", "count": 43},
    {"month": "Mar 2026", "count": 47},
    {"month": "Apr 2026", "count": 44},
    {"month": "May 2026", "count": 45}
  ],
  "service_breakdown": [
    {"service": "Weight Training", "count": 28},
    {"service": "Cardio", "count": 10},
    {"service": "Zumba", "count": 7}
  ]
}
```

### SQL Queries

**Monthly collections (last 6 months) — SQLite:**
```sql
SELECT strftime('%Y-%m', payment_date) AS month,
       SUM(amount_paid) AS total
FROM payments
WHERE gym_id = ?
  AND payment_date >= date('now', '-6 months')
GROUP BY strftime('%Y-%m', payment_date)
ORDER BY month ASC
```

**Monthly collections (last 6 months) — MySQL:**
```sql
SELECT DATE_FORMAT(payment_date, '%Y-%m') AS month,
       SUM(amount_paid) AS total
FROM payments
WHERE gym_id = ?
  AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
ORDER BY month ASC
```

> AGENT: Use `DB_DRIVER` env var to pick the correct query. Put both in `AnalyticsModel` as `getMonthlyCollectionsSQLite()` and `getMonthlyCollectionsMySQL()` and call the right one from a single `getMonthlyCollections()` method.

### Charts (Chart.js via CDN)
- **Bar chart:** Monthly collections (₹ on Y-axis, months on X-axis)
- **Line chart:** Active member count trend
- **Doughnut chart:** Service breakdown (Weight Training / Cardio / Zumba / Others)
- **Stat cards:** 6 big number cards above charts

---

## 14. PHASE 6 — WHATSAPP TEMPLATES

**Goal:** WhatsApp links use owner's custom templates, not hardcoded strings.

### Template Variable Reference
| Variable | Replaced With |
|---|---|
| `{name}` | Member's name |
| `{due}` | pending_due amount |
| `{days}` | Days until expiry OR days since expiry |
| `{expiry_date}` | Formatted expiry date (DD/MM/YYYY) |
| `{gym_name}` | Gym name from settings |

### `core/Helpers.php` — `buildWhatsappLink()` function
```php
function buildWhatsappLink(array $member, array $settings, string $gymName): string {
    $phone = preg_replace('/\D/', '', $member['phone_number']);
    if (strlen($phone) === 10) $phone = '91' . $phone;

    $today    = date('Y-m-d');
    $expiry   = $member['expiry_date'];
    $daysDiff = (int)round((strtotime($expiry) - strtotime($today)) / 86400);
    $due      = (float)$member['pending_due'];

    if ($due > 0) {
        $template = $settings['template_overdue'];
    } elseif ($daysDiff > 0) {
        $template = $settings['template_expiring_soon'];
    } elseif ($daysDiff === 0) {
        $template = $settings['template_expires_today'];
    } else {
        $template = $settings['template_expired'];
    }

    $message = str_replace(
        ['{name}', '{due}', '{days}', '{expiry_date}', '{gym_name}'],
        [
            $member['member_name'],
            '₹' . number_format($due, 0),
            abs($daysDiff),
            date('d/m/Y', strtotime($expiry)),
            $gymName
        ],
        $template
    );

    return 'https://wa.me/' . $phone . '?text=' . rawurlencode($message);
}
```

### WhatsApp Button in Member Card HTML
```html
<a href="<?= htmlspecialchars(buildWhatsappLink($member, $settings, $gymName)) ?>"
   target="_blank"
   class="wa-btn"
   title="Send WhatsApp to <?= htmlspecialchars($member['member_name']) ?>">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967..."/>
    </svg>
</a>
```

---

## 15. PHASE 7 — MEMBER PORTAL

**Goal:** Member logs in, sees only their own subscription status. Read-only. Cannot see gym data.

### Portal Route: `GET /portal`
```
1. Auth::guard() — any logged-in user
2. If role = 'owner' → redirect to /dashboard
3. Fetch member by user_id: SELECT * FROM members WHERE user_id = ? LIMIT 1
4. If not found → show "No membership found" message
5. Calculate days left: daysLeft = (strtotime(expiry_date) - strtotime(today)) / 86400
6. Determine status color: green (>10), amber (1-10), red (<=0)
7. Render views/portal/index.php
```

### Portal UI
```
┌─────────────────────────────────────┐
│          [GYM NAME]                 │
│                                     │
│    ╭───────────────────╮            │
│    │    SVG Ring       │            │
│    │  [  25  ]         │            │
│    │  days left        │            │
│    ╰───────────────────╯            │
│                                     │
│  Status:  ● ACTIVE                  │
│  Service: Weight Training           │
│  Expiry:  15/06/2026                │
│                                     │
│  ⚠️ Pending Due: ₹500               │  (hidden if 0)
│                                     │
└─────────────────────────────────────┘
```

---

## 16. PHASE 8 — DATA EXPORT

**Goal:** Owner can download all their data anytime, in CSV format.

### `GET /export/members`
```php
// AGENT: Always set headers BEFORE any output. If any whitespace is printed first, headers fail.

Auth::guard('owner');
$gymId   = Auth::gymId();
$members = MemberModel::getAllForExport($gymId);

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="members_' . date('Y-m-d') . '.csv"');

$out = fopen('php://output', 'w');
fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF)); // UTF-8 BOM for Excel

fputcsv($out, [
    'Name', 'Phone', 'Email', 'Service', 'Monthly Fee',
    'Pending Due', 'Start Date', 'Expiry Date', 'Joined Date',
    'Status', 'Last Renewed'
]);

foreach ($members as $m) {
    fputcsv($out, [
        $m['member_name'], $m['phone_number'], $m['member_email'] ?? '',
        $m['service_name'], $m['monthly_fee'], $m['pending_due'],
        $m['start_date'], $m['expiry_date'], $m['joined_date'],
        $m['status'], $m['last_renewed_at'] ?? ''
    ]);
}
fclose($out);
exit;
```

### `GET /export/payments`
```php
// Similar to above but for payments table
// Columns: Date, Member Name, Phone, Service, Amount Paid, Note
// JOIN members ON payments.member_id = members.id
// WHERE payments.gym_id = ? (ALWAYS include gym_id filter)
// Order by payment_date DESC
```

---

## 17. PHASE 9 — OFFLINE QUEUE & RELIABILITY

**Goal:** App doesn't fail when gym owner is in a basement with no internet.

**Scope:** Offline mode only covers ADD MEMBER. Renew and Clear Dues require live connection (they modify existing rows — conflict-free offline is too complex).

### `assets/js/offline.js`
```javascript
// AGENT: This is standalone vanilla JS. No ES modules. No import/export.
// It runs globally on the dashboard page.

const OFFLINE_KEY = 'gym_offline_queue';

function isOnline() { return navigator.onLine; }

function enqueueOffline(memberData) {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
    queue.push({ ...memberData, queued_at: new Date().toISOString() });
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(queue));
    updateOfflineBanner();
}

function getOfflineQueue() {
    return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
}

function clearOfflineQueue() {
    localStorage.removeItem(OFFLINE_KEY);
    updateOfflineBanner();
}

function updateOfflineBanner() {
    const queue = getOfflineQueue();
    const banner = document.getElementById('offline-banner');
    if (!banner) return;
    if (queue.length > 0) {
        banner.textContent = `📴 ${queue.length} member(s) saved offline, will sync when connected.`;
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }
}

async function flushOfflineQueue() {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    const failed = [];
    for (const item of queue) {
        try {
            const res = await apiFetch('/api/members', {
                method: 'POST',
                body: JSON.stringify(item)
            });
            if (!res.success) failed.push(item);
        } catch {
            failed.push(item);
        }
    }

    if (failed.length > 0) {
        localStorage.setItem(OFFLINE_KEY, JSON.stringify(failed));
    } else {
        clearOfflineQueue();
    }

    updateOfflineBanner();
    if (failed.length < queue.length) {
        showToast('✅ Offline members synced.');
        loadMembers(); // Refresh member list
    }
}

// Auto-sync when connection returns
window.addEventListener('online', () => {
    showToast('🟢 Connection restored. Syncing...');
    flushOfflineQueue();
});

// Check on load
document.addEventListener('DOMContentLoaded', () => {
    updateOfflineBanner();
    if (isOnline()) flushOfflineQueue();
});
```

### `assets/js/app.js` — Global Helpers
```javascript
// CSRF token (injected from PHP into a meta tag)
function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content || '';
}

// Universal fetch wrapper — always includes CSRF
async function apiFetch(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
        ...(options.headers || {})
    };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3500);
}

// Add Member — checks online status before submitting
async function submitAddMember(formData) {
    if (!navigator.onLine) {
        enqueueOffline(formData);
        showToast('📴 Saved offline. Will sync when connected.', 'warning');
        closeAddMemberModal();
        return;
    }
    try {
        const res = await apiFetch('/api/members', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        if (res.success) {
            showToast('✅ ' + res.member.member_name + ' added.');
            closeAddMemberModal();
            loadMembers();
        } else if (res.duplicate && res.canRejoin) {
            showRejoinPrompt(res.memberId, res.name);
        } else {
            showToast('❌ ' + res.error, 'error');
        }
    } catch {
        enqueueOffline(formData);
        showToast('📴 Network error. Saved offline.', 'warning');
    }
}
```

---

## 18. PHASE 10 — TRIAL & PAYWALL

**Goal:** 14-day trial, hard lockout on day 15.

### Trial Calculation (in PHP, no cron)
```php
function trialStatus(string $trialStartDate): array {
    $start   = strtotime($trialStartDate);
    $today   = strtotime(date('Y-m-d'));
    $daysDone = (int)(($today - $start) / 86400);
    return [
        'days_used'    => $daysDone,
        'days_left'    => max(0, TRIAL_DAYS - $daysDone),
        'is_expired'   => $daysDone >= TRIAL_DAYS,
    ];
}
```

### Paywall View (`views/paywall/index.php`)
```
Full-screen overlay. All content behind it (not just blurred — fully separate page).
Shows:
- "Trial Expired" heading
- "Your 14-day free trial has ended."
- UPI ID from gym_settings.upi_id
- "Open UPI App" button → upi://pay?pa={upi_id}&am=499&cu=INR&tn=GymManager
- "After payment, contact us to restore access." (manual reactivation)
```

---

## 19. API ENDPOINT REFERENCE

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/members` | owner | List members (tab + search filter) |
| POST | `/api/members` | owner | Add member |
| POST | `/api/members/edit` | owner | Edit member details |
| POST | `/api/members/renew` | owner | Renew subscription |
| POST | `/api/members/mark-dead` | owner | Mark member as dead |
| POST | `/api/members/rejoin` | owner | Rejoin a dead member |
| GET | `/api/members/check-duplicate` | owner | Check if phone exists |
| GET | `/api/services` | owner | List services |
| POST | `/api/services` | owner | Add service |
| POST | `/api/services/edit` | owner | Edit service |
| POST | `/api/services/delete` | owner | Delete service |
| GET | `/api/settings` | owner | Get gym settings |
| POST | `/api/settings` | owner | Save gym settings |
| GET | `/api/analytics` | owner | Get analytics data |
| GET | `/export/members` | owner | Download members CSV |
| GET | `/export/payments` | owner | Download payments CSV |

**All POST endpoints:**
- Require `X-CSRF-Token` header OR `csrf_token` in body
- Return `Content-Type: application/json`
- Return `{success: true, ...}` or `{success: false, error: "..."}`

---

## 20. FRONTEND ARCHITECTURE

### HTML Shell in `views/layout/header.php`
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="<?= CSRF::token() ?>">
    <meta name="theme-color" content="#111827">
    <title><?= APP_NAME ?></title>
    <link rel="stylesheet" href="/assets/css/app.css">
</head>
<body>
<div id="toast" class="toast"></div>
<div id="offline-banner" class="offline-banner" style="display:none"></div>
```

### CSS Architecture (`assets/css/app.css`)
Key classes to implement:

```css
/* Layout */
.page-shell        { max-width: 600px; margin: 0 auto; padding: 16px; }
.card              { background: #fff; border-radius: 20px; padding: 20px; margin-bottom: 16px; box-shadow: 0 4px 16px rgba(0,0,0,.06); }

/* Cash header */
.cash-header       { background: #dcfce7; color: #166534; text-align: center; padding: 20px; border-radius: 16px; }

/* Tabs */
.tab-group         { display: flex; background: #f3f4f6; border-radius: 14px; padding: 4px; gap: 4px; }
.tab-btn           { flex: 1; padding: 10px 4px; border-radius: 10px; background: transparent; color: #666; font-size: 0.8rem; font-weight: 600; border: none; cursor: pointer; }
.tab-btn.active    { background: #fff; color: #111; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
.tab-count         { font-size: 0.75rem; background: #e5e7eb; border-radius: 99px; padding: 1px 6px; margin-left: 4px; }
.tab-btn.active .tab-count.overdue-count { background: #fee2e2; color: #b91c1c; }

/* Member cards */
.member-card       { border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px; margin-bottom: 10px; }
.member-card-top   { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
.member-name       { font-weight: 700; font-size: 1rem; }
.service-tag       { font-size: 0.68rem; background: #f3f4f6; padding: 2px 8px; border-radius: 99px; color: #6b7280; text-transform: uppercase; }
.status-badge      { font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 99px; }
.badge-active      { background: #dcfce7; color: #166534; }
.badge-overdue     { background: #fee2e2; color: #b91c1c; }
.badge-dead        { background: #f3f4f6; color: #6b7280; }
.badge-rejoined    { background: #dbeafe; color: #1e40af; }
.member-card-bottom { display: flex; justify-content: space-between; align-items: center; }
.problem-text      { color: #dc2626; font-weight: 700; font-size: 0.85rem; }
.action-zone       { display: flex; gap: 6px; align-items: center; }
.udhaar-badge      { background: #fee2e2; color: #b91c1c; padding: 3px 8px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; }

/* Buttons */
.btn               { border: none; border-radius: 12px; padding: 10px 16px; cursor: pointer; font-weight: 600; font-size: 0.85rem; }
.btn-wa            { background: #25D366; color: #fff; padding: 10px; border-radius: 12px; display: flex; align-items: center; }
.btn-renew         { background: #2563eb; color: #fff; }
.btn-dead          { background: #6b7280; color: #fff; }
.btn-rejoin        { background: #7c3aed; color: #fff; }
.btn-edit          { background: #f59e0b; color: #fff; }
.btn-primary       { background: #111827; color: #fff; width: 100%; padding: 14px; font-size: 1rem; }
.btn-danger        { background: #dc2626; color: #fff; }

/* Form */
.form-row          { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
.form-row-3        { grid-template-columns: 1fr 1fr 1fr; }
input, select      { width: 100%; padding: 13px; border: 1px solid #e5e7eb; border-radius: 12px; font-size: 1rem; }
.input-error       { border-color: #dc2626; }
.error-msg         { color: #dc2626; font-size: 0.8rem; margin-top: -8px; margin-bottom: 8px; }
.live-udhaar       { background: #fee2e2; color: #b91c1c; padding: 8px 14px; border-radius: 10px; font-weight: 700; display: none; }

/* Date selector */
.date-grid         { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px; }
.date-btn          { padding: 12px 6px; font-size: 0.8rem; background: #f3f4f6; color: #111; }
.date-btn.active   { background: #2563eb; color: #fff; }

/* Search */
.search-bar        { width: 100%; padding: 13px 16px; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 14px; font-size: 0.95rem; }

/* Toast */
.toast             { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #111827; color: #fff; padding: 12px 24px; border-radius: 99px; opacity: 0; transition: opacity 0.3s; z-index: 999; pointer-events: none; white-space: nowrap; }
.toast.show        { opacity: 1; }
.toast.toast-error { background: #dc2626; }
.toast.toast-warning { background: #f59e0b; color: #111; }

/* Offline banner */
.offline-banner    { background: #fef3c7; color: #92400e; text-align: center; padding: 10px; font-size: 0.85rem; font-weight: 600; }

/* Paywall */
.lockout-overlay   { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.lockout-card      { background: #fff; border-radius: 24px; padding: 32px; max-width: 420px; width: 100%; text-align: center; }
.upi-box           { background: #f3f4f6; border: 1px dashed #d1d5db; border-radius: 14px; padding: 16px; margin: 16px 0; }

/* Analytics */
.stat-cards        { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
.stat-card         { background: #fff; border-radius: 14px; padding: 16px; text-align: center; border: 1px solid #e5e7eb; }
.stat-value        { font-size: 2rem; font-weight: 800; }
.stat-label        { font-size: 0.75rem; color: #6b7280; text-transform: uppercase; }

/* Portal */
.portal-ring       { display: flex; flex-direction: column; align-items: center; padding: 30px 0; }
.ring-label        { font-size: 2.5rem; font-weight: 800; }
.ring-sub          { font-size: 0.85rem; color: #6b7280; }

/* Mobile */
@media (max-width: 400px) {
    .form-row      { grid-template-columns: 1fr; }
    .stat-cards    { grid-template-columns: 1fr; }
}
```

---

## 21. SECURITY CHECKLIST

Every item below must be verified before considering any phase complete.

- [ ] All `$_POST` / `$_GET` values sanitized via `htmlspecialchars()` before display
- [ ] All SQL via PDO prepared statements — zero string concatenation in SQL
- [ ] CSRF token validated on every POST request
- [ ] Session regenerated on login (`session_regenerate_id(true)`)
- [ ] Passwords hashed with `PASSWORD_BCRYPT`, never stored plain
- [ ] Every query on `members`, `payments`, `gym_services` includes `gym_id = ?`
- [ ] Gym ownership verified before every update/delete (`WHERE id=? AND user_id=?`)
- [ ] No PHP errors exposed to user (`display_errors = Off` in production)
- [ ] `.env` file in `.gitignore`
- [ ] `db/` folder in `.gitignore` (SQLite file never committed)
- [ ] `Content-Type: application/json` set before every API response
- [ ] Member can only see their own row (portal: `WHERE user_id = ?`)
- [ ] Export endpoints verify owner role before streaming CSV
- [ ] CSRF token delivered via meta tag, never in URL

---

## 22. DEPLOYMENT — CODESPACES TO PRODUCTION

### Codespaces Setup (One Command)
```bash
# scripts/setup.sh
#!/bin/bash
echo "Setting up Gym Manager..."

cp .env.example .env
echo "✅ .env created — edit DB_DRIVER and credentials"

mkdir -p db assets/css assets/js

php db/migrate.php
echo "✅ Database migrated"

php db/seed.php
echo "✅ Test data seeded"

php -S 0.0.0.0:8000 -t .
echo "✅ Server running on port 8000"
```

### `db/migrate.php`
```php
<?php
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../core/Database.php';

$driver = $_ENV['DB_DRIVER'] ?? 'sqlite';
$schema = $driver === 'mysql'
    ? file_get_contents(__DIR__ . '/schema_mysql.sql')
    : file_get_contents(__DIR__ . '/schema.sql');

$db = getDB();

// Split on semicolons, run each statement
$statements = array_filter(array_map('trim', explode(';', $schema)));
foreach ($statements as $stmt) {
    if (!empty($stmt)) {
        $db->exec($stmt);
    }
}

echo "Migration complete ({$driver}).\n";
```

### Moving to Production (MySQL)

**Step 1:** Change `.env` on production server:
```env
DB_DRIVER=mysql
DB_HOST=localhost
DB_NAME=gym_manager_db
DB_USER=youruser
DB_PASS=yourpass
```

**Step 2:** Run migration on production:
```bash
php db/migrate.php
```

**Step 3:** Run seeder (optional, creates test owner):
```bash
php db/seed.php
```

**Step 4:** Run pre-deployment check:
```bash
php scripts/deploy_check.php
```

### `scripts/deploy_check.php`
```php
<?php
// AGENT: Run this before going live. It catches the 10 most common deployment failures.
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../core/Database.php';

$errors = [];

// 1. Check .env exists
if (!file_exists(__DIR__ . '/../.env')) $errors[] = '.env file missing';

// 2. Check DB connects
try { $db = getDB(); echo "✅ DB connected\n"; }
catch (Exception $e) { $errors[] = 'DB connection failed: ' . $e->getMessage(); }

// 3. Check all tables exist
$tables = ['users','gyms','members','payments','gym_services','gym_settings','member_history'];
foreach ($tables as $t) {
    try { $db->query("SELECT 1 FROM $t LIMIT 1"); echo "✅ Table: $t\n"; }
    catch (Exception $e) { $errors[] = "Missing table: $t"; }
}

// 4. Check APP_SECRET is not default
if ($_ENV['APP_SECRET'] === 'CHANGE_THIS') $errors[] = 'APP_SECRET not changed from default';

// 5. Check .env not publicly accessible (can't autocheck, just warn)
echo "⚠️  Ensure .env is blocked by .htaccess or server config\n";

if (count($errors) > 0) {
    echo "\n❌ DEPLOYMENT BLOCKED:\n";
    foreach ($errors as $e) echo "  - $e\n";
    exit(1);
}

echo "\n✅ All checks passed. Safe to deploy.\n";
```

---

## 23. COMMON BUGS & HOW TO PREVENT THEM

These are the exact mistakes AI agents make repeatedly when building PHP projects. This section is mandatory reading before starting each phase.

### Bug 1: Headers Already Sent
**Symptom:** `Warning: Cannot modify header information - headers already sent`
**Cause:** Whitespace or echo before `header()` call
**Fix:** Never output anything before `header()`. Omit closing `?>` from all PHP files. In `export.php`, ensure no whitespace at top of file.

### Bug 2: SQLite File Permissions
**Symptom:** `unable to open database file`
**Cause:** PHP process can't write to `db/` folder
**Fix:** `chmod 777 db/` in Codespaces. In production, ensure the web user owns the db directory.

### Bug 3: CSRF Token Mismatch After Session Timeout
**Symptom:** Random "Invalid CSRF token" on forms after being idle
**Cause:** Session expired, token regenerated
**Fix:** On 403 CSRF error from API, show toast "Session expired. Refreshing..." and `window.location.reload()`.

### Bug 4: PDO Fetch Returns False Instead of Null
**Symptom:** Undefined index errors when checking fetch results
**Cause:** `$stmt->fetch()` returns `false` (not `null`) when no row found
**Fix:** Always use `$result = $stmt->fetch(); return $result ?: null;` in Database class (already handled in the Database class above).

### Bug 5: SQLite Integer vs MySQL INT for IDs
**Symptom:** Works in SQLite, breaks in MySQL
**Cause:** SQLite `INTEGER PRIMARY KEY AUTOINCREMENT` vs MySQL `INT AUTO_INCREMENT`
**Fix:** Use the two separate schema files. Never use one schema for both.

### Bug 6: Date Function Differences
**Symptom:** Date queries return wrong results on MySQL
**Cause:** SQLite uses `date('now')`, MySQL uses `CURDATE()`
**Fix:** All date SQL must go through model methods that pick the right syntax based on `DB_DRIVER`.

### Bug 7: Phone Number Stored With Spaces or Dashes
**Symptom:** Duplicate check misses existing member
**Cause:** `9876-54-3210` stored, `9876543210` checked
**Fix:** Always strip non-numeric before storing AND before checking: `preg_replace('/\D/', '', $phone)` in both `add()` and `checkDuplicate()`.

### Bug 8: Missing gym_id Filter
**Symptom:** Gym A sees Gym B's members
**Cause:** Query forgot `AND gym_id = ?`
**Fix:** Every model method signature includes `int $gymId` as first parameter. Code review: grep for `FROM members WHERE` — every instance must have `gym_id = ?`.

### Bug 9: AJAX Sends HTML Not JSON
**Symptom:** `JSON.parse` fails, response is an HTML error page
**Cause:** PHP error occurs before `header('Content-Type: application/json')`, or header set too late
**Fix:** Set `Content-Type: application/json` as FIRST line of every API file. Turn off `display_errors` in production. In dev, catch all exceptions and return them as JSON.

### Bug 10: Session Not Started Before Auth Check
**Symptom:** `$_SESSION` always empty
**Cause:** `session_start()` not called
**Fix:** `Auth::start()` is called in `index.php` before any routing. Never call `session_start()` anywhere else.

### Bug 11: Offline Queue Syncs Duplicate Members
**Symptom:** Same member appears twice after going online
**Cause:** Offline sync retries all items including already-successful ones
**Fix:** The `UNIQUE (gym_id, phone_number)` constraint in the DB rejects duplicates. The sync function handles the error gracefully and removes the item from queue.

### Bug 12: Export CSV Corrupts Indian Names in Excel
**Symptom:** "Gurpreet" shows as garbled characters in Excel
**Cause:** Missing UTF-8 BOM
**Fix:** Always write BOM at start of CSV: `fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));`

### Bug 13: Infinite Redirect Loop
**Symptom:** Browser says "Too many redirects"
**Cause:** `/login` page also calls `Auth::guard()`, redirects to itself
**Fix:** Auth guard is NEVER called on login, logout, or register routes. In `index.php` router, those routes go straight to controller without guard.

### Bug 14: Dead Client Threshold Not Loaded
**Symptom:** Auto-dead logic always uses 60 days regardless of settings
**Cause:** `gym_settings` not loaded before calling `runAutoDeadUpdate()`
**Fix:** `DashboardController::index()` loads settings first, passes `dead_threshold_days` to the model method.

### Bug 15: WhatsApp Link Double-Encodes Characters
**Symptom:** `%25` appears in WhatsApp message
**Cause:** `urlencode()` used instead of `rawurlencode()`
**Fix:** Always use `rawurlencode()` for WhatsApp text parameter.

---

## BUILD ORDER SUMMARY

```
Phase 1:  Folder structure + .env + routing + DB layer + Auth + Login + Gym setup
Phase 2:  Member add + duplicate check + edit + mark dead + rejoin + member history log
Phase 3:  Dashboard page + tabs + search + member cards + WhatsApp links + renew + clear due
Phase 4:  Services CRUD + Gym settings page + WhatsApp templates editor
Phase 5:  Analytics page + Chart.js charts + stat cards + SQL queries for both DBs
Phase 6:  Member portal (read-only member login)
Phase 7:  CSV export (members + payments)
Phase 8:  Offline queue (localStorage + auto-sync on reconnect)
Phase 9:  Trial logic + paywall overlay
Phase 10: Deploy check script + production MySQL switch test
```

---

## QUICK REFERENCE: KEY DECISIONS

| Decision | Choice | Reason |
|---|---|---|
| Framework | None (plain PHP 8.2) | Runs on any ₹99/mo Indian host |
| ORM | None (PDO only) | No Composer, no dependencies |
| Auth | PHP sessions | Simple, stateless-compatible, no JWT overhead |
| DB (dev) | SQLite | Zero setup in Codespaces |
| DB (prod) | MySQL | Standard on Indian hosts |
| DB switch | Single env var `DB_DRIVER` | No code changes needed |
| Frontend | Vanilla JS | No npm, no build step, works on 4G |
| Charts | Chart.js CDN | One script tag, no npm |
| WhatsApp | `wa.me` URI | Free, no Meta API, owner's phone sends |
| Offline | localStorage | No service worker complexity |
| Export | PHP CSV stream | No library, works on any host |
| Passwords | `password_hash(BCRYPT)` | PHP standard, never plain text |
| Multi-tenant | `gym_id` in every query | No RLS (not Supabase), enforced in PHP |

---

*END OF PRD — Version 1.0*
*Give this entire file to your AI agent as the first message of every build session.*
*Agent must read from top to bottom before writing any code.*
