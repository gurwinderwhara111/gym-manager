# PRD: ₹499/Month Gym Tracker Micro-SaaS (India Market Edition)

## 1. Product Philosophy & Reality Checks
This product is built for the unorganized Indian fitness market (Tier-2/Tier-3, Punjab/Ludhiana focus). It ruthlessly avoids the "Builder Trap" of over-engineered Silicon Valley features. 

* **The Core Need:** Replace messy paper diaries and Google Sheets with a hyper-fast visual dashboard.
* **The "Udhaar" Reality:** Indian gyms operate on partial cash payments. Binary "Paid/Expired" logic fails here. A pending dues ledger is mandatory.
* **The Trust Deficit:** Gym owners will uninstall if they suspect we are tracking their revenue for taxes. We use **Zero Payment Gateways** (No Razorpay/Stripe). The app is strictly a dumb ledger for cash/UPI.
* **The "Basement" Network:** Local gyms have terrible 4G. The app must work offline for data entry.
* **The Communication Reality:** Emails do not work. Automated bots get blocked. We rely entirely on 1-click pre-filled WhatsApp links sent manually from the owner's phone.

---

## 2. Target Economics
* **Pricing:** ₹499 / Month (Flat fee, no long-term contracts).
* **Target:** 21 Active Gyms = ~₹10,000 Monthly Recurring Revenue (MRR).
* **Server Cost Limit:** Strictly ₹0 until scaling past 50 gyms.

---

## 3. Technical Architecture (The ₹0 Stack)
* **Frontend:** Next.js (Hosted on Vercel - Free Tier).
* **Database:** Supabase PostgreSQL (Free Tier).
* **Authentication:** Supabase Auth (Strictly Google OAuth. No passwords to forget, no OTP costs).
* **Emails:** Removed. Replaced by `wa.me` URI links.
* **Cron Jobs:** Removed. Replaced by real-time frontend filtering (e.g., "Expiring This Week" list loads dynamically when the owner logs in).

---

## 4. The Database Schema (Udhaar-Optimized)
Three simple tables to handle gyms, members, and the reality of partial payments.

```sql
-- 1. GYMS TABLE (Multi-tenant layer)
CREATE TABLE gyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_name TEXT NOT NULL,
    admin_email TEXT UNIQUE NOT NULL
);

-- 2. MEMBERS TABLE (Handles Expiry & Udhaar)
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES gyms(id),
    member_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    category TEXT CHECK (category IN ('Weight Training', 'Cardio', 'Zumba')),
    start_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    monthly_fee NUMERIC NOT NULL,
    pending_due NUMERIC DEFAULT 0 -- The Udhaar tracker
);

-- 3. PAYMENTS LEDGER (Tracks cash flow for the dashboard)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES gyms(id),
    member_id UUID REFERENCES members(id),
    amount_paid NUMERIC NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE
);
```

---

## 5. Core Features & UI/UX

### A. The 3-Second Data Entry (Friction Killer)

Adding a member must be faster than writing in a notebook. No HTML calendar widgets.

* **Fields:** Name (Text), Phone (Numpad), Total Fee, Amount Paid Today.
* **Date Selectors:** Three massive buttons: **[Starts Today]**, **[Starts Tomorrow]**, **[Custom Date]**.
* **Calculation:** The app automatically calculates `pending_due` (Total Fee - Amount Paid).

### B. "Basement Mode" (Offline-First Fallback)

* **Scope:** Only applies to "Add New Member" and "1-Click Renew".
* **Mechanism:** If network drops, data saves instantly to browser `localStorage`.
* **Sync:** A background JavaScript listener (`window.addEventListener('online')`) silently pushes the queue to Supabase when 4G returns. No complex two-way sync to avoid database conflicts.

### C. The Manager Dashboard (Role: Admin)

* **Cash Flow Header:** Live calculation of total rupees collected in the current month.
* **Expiring / Udhaar List:** Front and center. Shows members expiring in ≤ 5 days, OR members with a `pending_due > 0`.
* **1-Click WhatsApp:** A WhatsApp icon next to the name. Generates a URI: `wa.me/91[PHONE]?text=Sat%20Sri%20Akal%20[NAME]%2C%20your%20pending%20due%20is%20Rs.[DUE].`
* **1-Click Renew:** Shifts the user's `expiry_date` exactly 30 days forward instantly.

### D. The Member Portal (Role: User)

* A highly restricted, read-only view.
* Logs in via Google OAuth. Matches their email to the `members` table.
* **UI:** A massive countdown ring showing "Days Left", current category, and "Pending Dues" warning if applicable. Cannot see gym financials.

---

## 6. Execution & Sales Strategy

### Phase 1: The 7-Day Kill Switch (Validation)

Do not build the full app without testing demand.

1. Extract 50 local gym numbers daily via Google Maps (Manual or Instant Data Scraper). Skip corporate chains.
2. Send the localized WhatsApp DM: *"Sat Sri Akal Paaji. Quick question—still using Google Sheets/diaries? I built a ₹499 tracker to stop fee leakage. Can I send a 30-sec video?"*
3. **Threshold:** Send 350 DMs over 7 days. If you do not get at least **5 gyms** to accept a 14-day free trial, kill the idea or pivot.

### Phase 2: The 14-Day Trap

* Do not ask for payment upfront.
* Pre-load the owner's dashboard with 5 dummy members so it looks alive. Give them the login link.
* On Day 15, trigger a hard lockout. Show a UPI QR code: *"Pay ₹499 to unlock your data."*

### Phase 3: The Scale Cheat Code (B2B Distribution)

* Stop door-to-door sales after hitting the first 10 gyms.
* Approach wholesale gym equipment distributors in Jalandhar/Ludhiana.
* Offer a 50% revenue share (or bulk flat rate) for them to bundle 1 year of your software with every ₹2 Lakh+ treadmill/setup they sell. Distributors become your automated sales engine.
