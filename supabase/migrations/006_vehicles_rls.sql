-- ============================================
-- RLS Policies for Vehicles and Listings
-- ============================================

-- Enable RLS on tables that need it
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions_demo ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Public read access for vehicles_master and listings
-- ============================================
-- vehicles_master: public read
CREATE POLICY "vehicles_master_public_read" ON vehicles_master
    FOR SELECT
    USING (true);

-- listings: public read
CREATE POLICY "listings_public_read" ON listings
    FOR SELECT
    USING (true);

-- ============================================
-- users_profile policies
-- ============================================
CREATE POLICY "users_profile_select_own" ON users_profile
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "users_profile_update_own" ON users_profile
    FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "users_profile_insert_own" ON users_profile
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================
-- interactions policies
-- ============================================
CREATE POLICY "interactions_select_own" ON interactions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "interactions_insert_own" ON interactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- demo_users and interactions_demo: no RLS needed
-- (these are for demo purposes, can be public or restricted as needed)
-- ============================================
-- If you want to restrict demo_users, uncomment:
-- ALTER TABLE demo_users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "demo_users_public_read" ON demo_users FOR SELECT USING (true);

-- ALTER TABLE interactions_demo ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "interactions_demo_public_read" ON interactions_demo FOR SELECT USING (true);

