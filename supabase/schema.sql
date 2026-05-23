-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. CREATE TABLES WITH NEW MONETIZATION & AUTH COLUMNS
CREATE TABLE gyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_name TEXT NOT NULL,
    admin_email TEXT UNIQUE NOT NULL,
    trial_start_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    member_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    member_email TEXT,
    category TEXT CHECK (category IN ('Weight Training', 'Cardio', 'Zumba')),
    start_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    monthly_fee NUMERIC NOT NULL,
    pending_due NUMERIC DEFAULT 0
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    amount_paid NUMERIC NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 4. SECURITY POLICIES
CREATE POLICY "Admin can insert own gym" ON gyms
    FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = admin_email);

CREATE POLICY "Admin can view own gym" ON gyms
    FOR SELECT USING (auth.jwt() ->> 'email' = admin_email);

CREATE POLICY "Admin can update own gym" ON gyms
    FOR UPDATE USING (auth.jwt() ->> 'email' = admin_email)
    WITH CHECK (auth.jwt() ->> 'email' = admin_email);

CREATE POLICY "Admin can manage own gym members" ON members
    FOR ALL USING (
        gym_id IN (
            SELECT id FROM gyms WHERE admin_email = auth.jwt() ->> 'email'
        )
    ) WITH CHECK (
        gym_id IN (
            SELECT id FROM gyms WHERE admin_email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Members can view own status" ON members
    FOR SELECT USING (auth.jwt() ->> 'email' = member_email);

CREATE POLICY "Admin can manage own gym payments" ON payments
    FOR ALL USING (
        gym_id IN (
            SELECT id FROM gyms WHERE admin_email = auth.jwt() ->> 'email'
        )
    ) WITH CHECK (
        gym_id IN (
            SELECT id FROM gyms WHERE admin_email = auth.jwt() ->> 'email'
        )
    );
