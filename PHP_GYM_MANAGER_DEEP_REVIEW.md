# PHP Gym Manager — Complete Deep Code Review
## Every File, Every Bug, Every Gap, Every Fix

---

## 1. ARCHITECTURE OVERVIEW

```
index.php (single entry point / router)
├── config/
│   ├── app.php          — env loading, constants
│   └── db.php           — PDO connection (SQLite / MySQL)
├── core/
│   ├── Database.php     — PDO singleton wrapper
│   ├── Auth.php         — session auth + role guard
│   ├── CSRF.php         — token generation + validation
│   ├── Request.php      — input sanitization wrapper
│   ├── Response.php     — JSON / redirect output
│   └── Helpers.php      — formatDate, daysLeft, buildWhatsappLink
├── models/              — all DB queries live here
├── controllers/         — business logic + request handling
├── views/               — PHP HTML templates
├── assets/
│   ├── css/app.css
│   └── js/              — app.js, dashboard.js, offline.js, analytics.js
├── db/
│   ├── schema.sql       — SQLite schema
│   ├── schema_mysql.sql — MySQL schema
│   ├── migrate.php      — schema runner
│   └── seed.php         — test data
└── tests/integration_test.php
```

**Stack:** PHP + PDO + SQLite (dev) / MySQL (prod) + vanilla JS + Chart.js

---

## 2. DATABASE SCHEMA — DEEP REVIEW

### Tables (7 total)

| Table | Purpose | Status |
|---|---|---|
| `users` | Gym owners + member portal logins | ✅ Solid |
| `gyms` | One gym per owner. Has `upi_id`, `trial_start_date` | ✅ Solid |
| `gym_services` | Owner-defined service catalog with prices | ✅ Solid |
| `gym_settings` | Message templates + dead threshold config | ✅ Good design |
| `members` | Core member data with status + history hooks | ✅ Well structured |
| `payments` | Cash ledger. `note` field tracks payment type | ✅ Good |
| `member_history` | Full audit trail (joined/renewed/dead/rejoined) | ✅ Excellent addition |

### What this schema has that the Next.js version didn't

| Feature | PHP Schema | Next.js Schema |
|---|---|---|
| `member_history` audit trail | ✅ Yes | ❌ No |
| `gym_settings` (templates + threshold) | ✅ Separate table | ❌ Columns on gyms |
| `joined_date` (never changes on rejoin) | ✅ Yes | ❌ No |
| `last_renewed_at` | ✅ Yes | ❌ No |
| `service_name` denormalized on members | ✅ Yes (survives service deletion) | ❌ No |
| `status` column on members | ✅ `active/overdue/dead/rejoined` | ❌ Computed client-side |
| `dead_threshold_days` configurable | ✅ Yes, per gym | ❌ Hardcoded |
| Indexes on hot columns | ✅ 6 indexes | ❌ None |
| `note` field on payments | ✅ Yes | ❌ No |

### Schema Bugs & Gaps

**BUG 1: `gym_services` has no `duration_days`**
```sql
-- Current (broken for non-monthly services):
CREATE TABLE gym_services (
    price REAL NOT NULL DEFAULT 0
    -- duration_days is MISSING
);
-- All services hardcoded to 30 days in PHP controllers
-- Zumba 3-month packages, quarterly memberships = impossible
```
Fix: Add `duration_days INTEGER NOT NULL DEFAULT 30`.

**BUG 2: `members.status` inconsistency between SQLite and MySQL**
```sql
-- SQLite: TEXT with no constraint
status TEXT NOT NULL DEFAULT 'active'

-- MySQL: ENUM
status ENUM('active','overdue','dead','rejoined') NOT NULL DEFAULT 'active'
```
In SQLite, nothing prevents `status = 'banana'`. Fix: Add a CHECK constraint to SQLite schema:
```sql
status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','overdue','dead','rejoined'))
```

**GAP 1: No `is_unlocked` field on `gyms`**
The trial paywall cannot be unlocked after payment. There's no column to flip. The only escape is to manually edit the DB or change `trial_start_date`.
Fix: `ALTER TABLE gyms ADD COLUMN is_unlocked INTEGER NOT NULL DEFAULT 0;`

**GAP 2: `gym_settings` not created automatically on gym creation**
`GymController::createGym()` does insert into `gym_settings`. ✅ This is handled.
But `AnalyticsModel::getStats()` calls `MemberModel::countsByStatus()` which does:
```sql
SELECT * FROM gym_settings WHERE gym_id = ?
```
If for some reason `gym_settings` row is missing (e.g., legacy data), it silently returns NULL.

---

## 3. CORE LAYER — DEEP REVIEW

### `Database.php` ✅ Good
- Singleton correctly implemented
- All 6 methods cover real needs (fetch, fetchAll, execute, lastInsertId, transactions)
- Transactions are properly exposed (`beginTransaction`, `commit`, `rollBack`)
- No issues found

### `Auth.php` — Critical Issues

**BUG 1: `trialGuard()` is NEVER CALLED**
```php
// Auth.php defines this:
public static function trialGuard(): void { ... }

// But NOWHERE in index.php, DashboardController, or any controller
// is Auth::trialGuard() actually called.
// The trial paywall is completely non-functional.
```
Fix: Add to `DashboardController::index()`:
```php
Auth::trialGuard(); // Must be called after Auth::guard()
```
Or add it to `index.php` middleware for all protected routes.

**BUG 2: Session `trial_start_date` can go stale**
If the gym's trial_start_date is updated in the DB, the session still holds the old value. The session is only refreshed on login.

**BUG 3: API guard check is fragile**
```php
$isApi = str_contains($_SERVER['REQUEST_URI'], '/api/') || 
         (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && ...);
```
`HTTP_X_REQUESTED_WITH` is not sent by `fetch()` — only by jQuery AJAX. The JS code uses plain `fetch()`. For API routes that don't contain `/api/` in URL, this will redirect to `/login` instead of returning JSON 401.

### `CSRF.php` ✅ Excellent
- `bin2hex(random_bytes(32))` — cryptographically secure token
- `hash_equals()` — timing-safe comparison
- `assertValid()` — terminates with JSON error for API calls
- Meta tag injection via `field()` for JS to read
- No issues found

### `Request.php` — Issue
```php
public static function sanitize($value) {
    if (is_string($value)) {
        return htmlspecialchars(trim($value), ENT_QUOTES, 'UTF-8');
    }
}
```
`htmlspecialchars()` is output escaping, not input sanitization. It converts `<` to `&lt;`. If a member is named `O'Brien`, their name gets stored as `O&#039;Brien` in the DB, and displayed correctly in HTML but broken in CSV exports and WhatsApp messages.
Fix: Only sanitize on output (in views), not on input. Store raw values in DB.

### `Response.php` ✅ Good
- Clean JSON wrapper
- `exit` after redirect (with TEST_MODE bypass) is correct
- Spread operator `...$data` into success response is clean

### `Helpers.php` — Good with one bug

**`buildWhatsappLink()`** — The Indian phone handling is thorough:
- Strips leading `0`
- Strips leading `91` if already 12 digits
- Forces `91` prefix for wa.me

**Minor gap**: No template variable for `{gym_name}` in rejoin template, but `{gym_name}` is listed as a replacement variable. Actually it IS replaced via `str_replace([..., '{gym_name}'], [..., $gymName], $template)`. ✅ Fine.

---

## 4. MODELS — DEEP REVIEW

### `MemberModel.php` — Critical Bugs

**BUG 1: Rejoined members invisible in "running" tab**
```php
if ($status === 'running') {
    $sql .= " AND status = 'active' AND expiry_date >= date('now')";
}
```
After a member rejoins, their `status` is set to `'rejoined'`, NOT `'active'`. They will never appear in the running tab. They're invisible to the gym owner.
Fix:
```php
$sql .= " AND status IN ('active', 'rejoined') AND expiry_date >= date('now')";
```

**BUG 2: Overdue tab logic is confused**
```php
elseif ($status === 'overdue') {
    $sql .= " AND (status IN ('active','overdue') AND (expiry_date < date('now') OR pending_due > 0))";
}
```
This puts members with `pending_due > 0` who are still active into the overdue tab. A member who is 15 days from expiry but owes ₹500 pending due will appear in overdue, not running. This confuses the gym owner.
Fix: Separate "Expiring/Expired" from "Pending Dues" — or only use `expiry_date` for overdue filter:
```php
$sql .= " AND status IN ('active','overdue') AND expiry_date < date('now')";
```

**BUG 3: `runAutoDeadUpdate()` — order of operations is wrong**
```php
// Step 1: Active -> Overdue if expired
UPDATE members SET status = 'overdue' WHERE status = 'active' AND expiry_date < date('now')

// Step 2: Active/Overdue -> Dead if past threshold
UPDATE members SET status = 'dead' WHERE status IN ('active','overdue') AND expiry_date < ?
```
Step 1 moves active→overdue. Step 2 then moves some of those same members to dead. But the threshold cutoff date is calculated correctly. Issue: Step 2 checks `status IN ('active','overdue')` but after Step 1, all expired active members are now overdue. However, if a member was already overdue before Step 1, they're caught by Step 2. This flow is actually correct.

**Real issue**: `runAutoDeadUpdate()` is only called on `DashboardController::index()`. It's never called for API requests (`/api/members`). So member statuses shown in the member list API may be stale if the owner loads the dashboard but then the list refreshes via JS (which hits `/api/members` directly without triggering the status update).
Fix: Call `runAutoDeadUpdate()` at the start of `MemberController::list()` as well.

**BUG 4: `renew()` date calculation doesn't account for MySQL vs SQLite**
```php
$newExpiry = date('Y-m-d', strtotime("+$months months", $baseDate));
```
`$baseDate = max($today, $currentExpiry)` — both are Unix timestamps from PHP `strtotime()`. This is PHP-side date math, works for both DBs. ✅ Fine.
But `+1 month` from Jan 31 gives Feb 28/29 in PHP (correct behavior).

### `GymModel.php` — SQL Injection Risk

```php
public function update(int $id, array $data): bool {
    foreach ($data as $key => $val) {
        $fields[] = "$key = ?";  // KEY IS INTERPOLATED DIRECTLY INTO SQL
        $params[] = $val;
    }
    $sql = "UPDATE gyms SET " . implode(', ', $fields) . " WHERE id = ?";
```
If `$data` contains `'; DROP TABLE gyms; --` as a key, it's interpolated directly into the SQL string. Values are parameterized ✅, but column names are NOT.
Fix: Add a whitelist exactly like `MemberModel::edit()` does:
```php
$allowed = ['gym_name', 'owner_name', 'owner_phone', 'gym_address', 'upi_id'];
$data = array_intersect_key($data, array_flip($allowed));
```

### `AnalyticsModel.php` — Issues

**Issue 1: `getStats()` SQLite syntax**
```sql
SELECT COUNT(*) as c FROM members WHERE gym_id = ? 
AND joined_date >= date('now', 'start of month')
```
`date('now', 'start of month')` is valid SQLite. ✅

**Issue 2: MySQL variant missing in `getStats()`**
```php
// getMonthlyCollections() correctly has SQLite/MySQL branches
// But getStats() always uses SQLite date() syntax — will BREAK on MySQL
$sql = "SELECT COUNT(*) ... AND joined_date >= date('now', 'start of month')";
// MySQL equivalent would be: DATE_FORMAT(NOW(), '%Y-%m-01')
```

**Issue 3: `getServiceBreakdown()` only counts `active` members**
Members with status `rejoined` who are using a service won't appear in the breakdown. Change `status = 'active'` to `status IN ('active', 'rejoined')`.

### `SettingsModel.php` ✅ Good
- Whitelist of allowed keys before upsert
- Correct INSERT OR UPDATE pattern
- No issues

### `PaymentModel.php`
Extremely thin — only one method `getMonthlyTotal()`. Missing:
- `getByDateRange()` for analytics
- `getByMember()` for member history view
These queries are handled in `AnalyticsModel` instead, which is fine for the MVP.

---

## 5. CONTROLLERS — DEEP REVIEW

### `MemberController.php` — Critical Bugs

**BUG 1: `renew()`, `clearDue()`, `markDead()` read `Request::post('id')` but JS sends JSON**

The JS code:
```js
await apiFetch('/api/members/renew', {
    method: 'POST',
    body: JSON.stringify({ id })  // JSON body
});
```

The controller:
```php
$id = (int)Request::post('id');  // reads $_POST — EMPTY when body is JSON
```

`$_POST` is only populated for `application/x-www-form-urlencoded` or `multipart/form-data`. JSON bodies go to `php://input`. So `$id` is always `0`, meaning every renew/clearDue/markDead silently fails or operates on the wrong member.

Fix all affected controllers:
```php
$data = Request::json() ?? $_POST;
$id = (int)($data['id'] ?? 0);
```

**BUG 2: `edit()` has same mismatch**
```php
$id = (int)Request::post('id');  // broken for JSON requests
$data = Request::json() ?? $_POST;  // data comes from JSON
```
So `$id` is 0 but `$data` has the actual data. Edit will always fail to find the member.

**BUG 3: `add()` — service validation too strict**
```php
$service = $db->fetch("SELECT name FROM gym_services WHERE id = ? AND gym_id = ?", [$serviceId, $gymId]);
if (!$service) {
    Response::error('Invalid service selected');
}
```
If the gym has no services set up yet (new gym), `$serviceId` would be 0 and this always returns an error. New gym owners can't add their first member until they create a service.
Fix: Allow service to be optional — if no service, set `service_name` to a default like "General".

**BUG 4: `checkDuplicate()` endpoint exists but is NEVER called from JS**
The JS `dashboard.js` never calls `/api/members/check-duplicate` before submitting the add form. The duplicate check only happens server-side in `add()`, which returns a JSON response that the JS handles. This is actually OK design, but the `checkDuplicate()` endpoint is dead code.

**GAP: `rejoin()` doesn't log payment**
By design (user said "stay away from payment handling for rejoin") — ✅ intentional.

### `GymController.php` ✅ Good
- Creates `gym_settings` row on gym creation
- Seeds 3 default services
- Updates session with new gym ID

### `DashboardController.php` — Missing Calls
```php
public function index(): void {
    Auth::guard('owner');
    // Auth::trialGuard();  ← MISSING. Trial never enforced.
    
    (new MemberModel())->runAutoDeadUpdate($gymId);  // ✅ Called
    
    // But: runAutoDeadUpdate is NOT called in MemberController::list()
    // So live member list API can return stale statuses
}
```

### `ExportController.php` ✅ Best in codebase
- UTF-8 BOM prepended: `chr(0xEF).chr(0xBB).chr(0xBF)` — Excel opens correctly
- `fputcsv()` handles quoting automatically
- Separate endpoints for members and payments
- Joined via SQL JOIN for payments export (includes member name)
- Auth guard on both endpoints

### `SettingsController.php` — Gap
The settings view sends gym details (name, address, phone, UPI ID) to `/api/settings` POST. But `SettingsModel::save()` only handles `gym_settings` table (templates + threshold). Gym details like `gym_name`, `upi_id`, `owner_name`, `gym_address` go nowhere — they're silently dropped.
Fix: The `SettingsController::save()` should detect and route gym-level fields to `GymModel::update()` separately.

---

## 6. JAVASCRIPT — DEEP REVIEW

### `app.js` — Issues

**Issue 1: `checkActualConnectivity()` uses `mode: 'no-cors'`**
```js
await fetch('/favicon.ico?t=' + Date.now(), { mode: 'no-cors', cache: 'no-store' });
```
With `no-cors`, the response is always opaque (type: 'opaque'). You can't read the status. The `await` will resolve even if the server returns 500. You can't distinguish "server exists but returned error" from "no internet". For this use case (just checking if the network pipe exists), `no-cors` is actually acceptable.

**Issue 2: `apiFetch` prefixes all URLs with `/index.php`**
```js
const routedUrl = url.startsWith('/') ? `/index.php${url}` : url;
```
This means every API call goes to `/index.php/api/members`. But `index.php` strips `/index.php` from the URI:
```php
$uri = str_replace('/index.php', '', $uri);
```
So `/index.php/api/members` becomes `/api/members`. ✅ This works, but it's a fragile hack. A cleaner solution would be a proper `.htaccess` rewrite.

### `dashboard.js` — Multiple Bugs

**BUG 1: Hardcoded `monthly_fee: 1500` in member card**
```js
const memberData = {
    id: id,
    member_name: card.querySelector('strong').textContent,
    pending_due: card.querySelector('.udhaar-badge')?.textContent.replace('Udhaar: ₹', '') || 0,
    service_name: card.querySelector('.service-tag').textContent,
    monthly_fee: 1500 // Default or fetched  ← HARDCODED BUG
};
```
When `handleMemberAction('renew', id, memberData)` is called, the rejoin modal prefills `monthly_fee: 1500` regardless of the member's actual fee. Members paying ₹800 (Zumba) would have ₹1500 pre-filled.
Fix: Store member data as JSON in a `data-member` attribute on the card, or fetch from API.

**BUG 2: `pending_due` scraping breaks for members with no badge**
```js
pending_due: card.querySelector('.udhaar-badge')?.textContent.replace('Udhaar: ₹', '') || 0,
```
If there's no `.udhaar-badge` element (no pending due), this is `0`. But `0` is a string `'0'`, not number `0`. When passed to `clearDue`, `(float)'0'` works but comparisons like `$amount <= 0` would be correct. Minor type coercion issue.

**BUG 3: `setQuickDate('yesterday')` doesn't match PRD**
The PRD (and Next.js version) used "Starts Today / Starts Tomorrow / Custom". The PHP version changed "Tomorrow" to "Yesterday". A member joining today but whose subscription started yesterday is uncommon. "Tomorrow" makes more sense for pre-booking.

**BUG 4: Member status badge shows `STATUS.toUpperCase()` from server**
```js
m.status === 'active' ? 'badge-active' : (m.status === 'overdue' ? 'badge-overdue' : 'badge-dead')
```
`rejoined` status gets `badge-dead` class (grey) even though the member is active. The rejoined badge class exists in CSS but isn't in this ternary.
Fix:
```js
const badgeClass = {active:'badge-active', rejoined:'badge-rejoined', overdue:'badge-overdue', dead:'badge-dead'}[m.status] || 'badge-dead';
```

**BUG 5: Search not debounced on first load**
`loadMembers()` is called immediately on `DOMContentLoaded`, which is correct. But the search debounce fires after 300ms. If the owner types very fast, multiple `loadMembers()` calls can be in-flight simultaneously, causing race conditions where an older result overwrites a newer one.
Fix: Cancel in-flight requests using `AbortController`.

### `offline.js` ✅ Mostly Good
- `flushOfflineQueue()` discards 400 errors (duplicates) — correct behavior
- Updates banner with actual connectivity check — correct
- Runs flush on `DOMContentLoaded` AND on `'online'` event — both needed
- **Issue**: `enqueueOffline()` pushes `{ ...memberData, queued_at: ... }`. But `memberData` from the form includes CSRF token as a form field. The CSRF token in the offline queue may be expired by the time it's synced. Since `apiFetch` sends CSRF via header (from meta tag), not from the stored data, this isn't a problem — the fresh page CSRF token is used. ✅ Fine.

### `analytics.js` ✅ Good
- Uses Chart.js loaded from CDN
- Bar chart for revenue, line for growth, doughnut for service distribution
- All data comes from `/api/analytics`
- Error toast on failure

---

## 7. VIEWS — DEEP REVIEW

### `views/dashboard/index.php` — Critical Bug

**BUG: Duplicate/orphaned Add Member form HTML**
The file contains the complete Add Member modal (lines ~80-130), then later (lines ~175-200) there's ANOTHER partial Add Member form block with no wrapping div or modal. This raw HTML will render directly on the page below the footer. It includes a dangling phone input, service select, fee inputs, and date buttons with no container.
This makes the dashboard render broken HTML. The browser may try to close unclosed tags, causing layout corruption.

Fix: Remove the duplicate partial form block at the bottom of the file (starting with `<div><label>Phone Number *</label>...`).

### `views/analytics/index.php` — Fatal Error

```php
require_once __DIR__ . '/../views/layout/header.php';
// ^^ WRONG PATH
// __DIR__ is /views/analytics/
// '/../views/layout/header.php' resolves to /views/views/layout/header.php
// Correct path: '/../layout/header.php'
```
This will throw a PHP fatal error and the analytics page will be blank.
Fix: Change to `require_once __DIR__ . '/../layout/header.php';`

### `views/portal/index.php` — Undefined Variable

```php
<h1><?= htmlspecialchars($gym_name ?? 'My Gym') ?></h1>
```
`PortalController::index()` does `require_once __DIR__ . '/../views/portal/index.php'` but never sets `$gym_name`. It only sets `$member`, `$daysLeft`, `$statusColor`.
Fix in `PortalController::index()`:
```php
$gym = $db->fetch("SELECT g.gym_name FROM gyms g JOIN members m ON g.id = m.gym_id WHERE m.id = ?", [$member['id']]);
$gym_name = $gym['gym_name'] ?? 'My Gym';
```

### `views/settings/index.php` — Settings Not Saved Correctly

The form submits to `/api/settings` (POST). But `SettingsController::save()` calls `SettingsModel::save()` which only updates `gym_settings` table (templates + threshold). Gym fields in the form (`gym_name`, `owner_name`, `owner_phone`, `gym_address`, `upi_id`) are passed in the JSON but silently dropped.
Fix: `SettingsController::save()` must split the payload:
```php
$gymFields = array_intersect_key($sanitized, array_flip(['gym_name','owner_name','owner_phone','gym_address','upi_id']));
$settingsFields = array_intersect_key($sanitized, array_flip(['template_overdue','template_expiring_soon','template_expires_today','template_expired','template_rejoin','dead_threshold_days']));

if (!empty($gymFields)) {
    (new GymModel())->update(Auth::gymId(), $gymFields);
}
if (!empty($settingsFields)) {
    $this->settingsModel->save(Auth::gymId(), $settingsFields);
}
```

### `views/setup/create_gym.php` ✅ Good
- CSRF field present
- All relevant fields
- Clean form

### `views/auth/login.php` ✅ Good
- CSRF field
- Email + password inputs
- No issues

### `views/paywall/index.php`
- Shows UPI ID from gym settings ✅
- `upi://pay?pa=...&am=499&cu=INR` deep link ✅
- **Gap**: `$gym` variable used but `PortalController::showPaywall()` → actually it's `DashboardController::showPaywall()`. That method fetches `$gym` correctly. ✅

---

## 8. ROUTER (`index.php`) — Review

```php
match(true) {
    $uri === '/api/members' && $method === 'GET'  => ...,
    $uri === '/api/members' && $method === 'POST' => ...,
    ...
}
```

Good:
- Single entry point — all routes visible in one place
- Both GET and POST differentiated cleanly
- 404 default handler

**Gap 1: No middleware layer**
`Auth::trialGuard()` has to be manually called in every relevant controller. There's no way to apply it as middleware for all owner routes.

**Gap 2: CSRF not validated on GET requests** (correct — CSRF only matters for state-changing POST/PUT/DELETE)

**Gap 3: No `/api/gym/update` route**
`GymModel::update()` exists but there's no controller endpoint or route that calls it. Gym details can't be updated via API.

**Gap 4: `/api/members/edit` route exists but it's never called from JS**
`dashboard.js` has no code to open an edit member form or call this endpoint. The edit feature in the router is dead for now.

---

## 9. INTEGRATION TESTS — Review

```php
// tests/integration_test.php
```

Good:
- Tests login, dashboard access, member list, add member, renew, analytics
- Uses `ob_start()` to capture output
- TEST_MODE prevents `exit` on redirects

**Gap 1**: Tests don't verify that duplicate phone returns the correct error
**Gap 2**: No test for rejoin flow
**Gap 3**: No test for export endpoints
**Gap 4**: Tests always use `gym_id = 1` hardcoded — fragile if seed order changes
**Gap 5**: `renew` test sends `$_POST` data but the real controller reads JSON (`Request::json()`). So the test doesn't actually test the real code path.

---

## 10. COMPLETE BUG REGISTRY

### 🔴 Critical (Will break features completely)

| # | File | Bug | Impact |
|---|---|---|---|
| 1 | `Auth.php` | `trialGuard()` defined but never called | Trial paywall never enforces |
| 2 | `MemberController.php` | `renew()`, `clearDue()`, `markDead()` use `Request::post('id')` with JSON body | All three actions always fail silently |
| 3 | `MemberController.php` | `edit()` reads `id` from `$_POST` but data from JSON | Edit never works |
| 4 | `views/dashboard/index.php` | Duplicate/orphaned Add Member HTML at bottom | Page renders broken, layout corrupted |
| 5 | `views/analytics/index.php` | Wrong `require_once` path for header | Analytics page is a fatal PHP error |

### 🟠 High (Feature works but incorrectly)

| # | File | Bug | Impact |
|---|---|---|---|
| 6 | `MemberModel.php` | `getAllByGym('running')` excludes `rejoined` status | Rejoined members invisible in dashboard |
| 7 | `SettingsController.php` | Gym details posted to settings endpoint silently dropped | Owner can never update gym name/phone/UPI via settings |
| 8 | `GymModel.php` | No column whitelist in `update()` | SQL injection via column name |
| 9 | `dashboard.js` | `monthly_fee: 1500` hardcoded in member card scraping | Wrong fee in rejoin modal for all non-₹1500 plans |
| 10 | `AnalyticsModel.php` | `getStats()` uses SQLite `date()` syntax, breaks on MySQL | Analytics broken in production |

### 🟡 Medium (Feature partially works)

| # | File | Bug | Impact |
|---|---|---|---|
| 11 | `MemberModel.php` | `getAllByGym('overdue')` includes active members with pending dues | Overdue tab shows wrong members |
| 12 | `dashboard.js` | `badge-rejoined` CSS class never applied | Rejoined members show grey "dead" badge |
| 13 | `MemberController.php` | `list()` doesn't call `runAutoDeadUpdate()` | Member list statuses can be stale |
| 14 | `Request.php` | `htmlspecialchars()` on DB input — HTML-encodes stored data | Names like "O'Brien" stored as "O&#039;Brien" |
| 15 | `views/portal/index.php` | `$gym_name` undefined | "My Gym" shown instead of real gym name |

### 🟢 Low (Polish issues)

| # | File | Bug | Impact |
|---|---|---|---|
| 16 | `schema.sql` | No `is_unlocked` column on gyms | No way to unlock after payment |
| 17 | `gym_services` | No `duration_days` column | All memberships locked to 30 days |
| 18 | `dashboard.js` | `setQuickDate('yesterday')` instead of tomorrow | Minor UX mismatch from PRD |
| 19 | `MemberModel.php` | `getServiceBreakdown()` excludes rejoined members | Analytics undercount |
| 20 | `tests/integration_test.php` | Renew test uses `$_POST` not JSON | Test doesn't test real code path |

---

## 11. WHAT IS GENUINELY EXCELLENT

These parts are production-quality and should be kept:

1. **`member_history` table** — Full audit log of every join/renew/dead/rejoin event. No other version had this.
2. **`gym_settings` with per-gym templates** — Configurable dead threshold + 5 separate message templates per gym is far better than the Next.js hardcoded strings.
3. **`ExportController.php`** — UTF-8 BOM, `fputcsv()`, both members and payments exportable, joined payment export with member name. Best-written file in the codebase.
4. **`CSRF.php`** — `random_bytes(32)` + `hash_equals()` is textbook CSRF protection.
5. **`offline.js`** — Discarding 400 errors from queue (duplicates) rather than retrying forever is smart. `checkActualConnectivity()` is better than trusting `navigator.onLine`.
6. **`MemberModel::runAutoDeadUpdate()`** — Two-pass status update (active→overdue, then overdue→dead) using configurable threshold pulled from DB. Correct logic.
7. **`buildWhatsappLink()` phone normalization** — Handles leading 0, leading 91, and 10-digit normalization. Covers all Indian number formats gym owners will enter.
8. **DB dual-support (SQLite/MySQL)** — `db.php` cleanly switches drivers. `schema_mysql.sql` has proper ENUM, proper types. `AnalyticsModel` branches per driver (except for the bug in `getStats()`).
9. **`scripts/deploy_check.php`** — Pre-deployment validation of all 7 tables and env config. Genuinely useful.
10. **`seed.php`** — Seeds with real Punjabi names, realistic dues, multiple statuses. Makes testing feel real.

---

## 12. PRIORITY FIX ORDER

Fix these in this exact sequence:

```
1. [CRITICAL] Fix Request::post('id') → Request::json() in renew/clearDue/markDead/edit controllers
2. [CRITICAL] Call Auth::trialGuard() in DashboardController::index()
3. [CRITICAL] Remove duplicate HTML block at bottom of dashboard/index.php
4. [CRITICAL] Fix analytics/index.php header path (/../views/ → /../)
5. [HIGH] Add whitelist to GymModel::update()
6. [HIGH] Fix MemberModel::getAllByGym('running') to include 'rejoined' status
7. [HIGH] Fix SettingsController::save() to split gym details vs settings
8. [HIGH] Fix AnalyticsModel::getStats() MySQL date syntax
9. [MEDIUM] Fix member card JS to store real monthly_fee (not hardcoded 1500)
10. [MEDIUM] Call runAutoDeadUpdate() in MemberController::list() too
11. [MEDIUM] Fix badge-rejoined not being applied in dashboard.js
12. [MEDIUM] Add $gym_name to PortalController
13. [LOW] Add duration_days to gym_services schema
14. [LOW] Add is_unlocked to gyms schema
15. [LOW] Add CHECK constraint to members.status in SQLite schema
```
