-- ============================================
-- Vehicles Master and Listings Schema
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Try to enable pgvector (optional, won't fail if not available)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
    RAISE NOTICE 'pgvector extension enabled';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pgvector extension not available (this is okay)';
END $$;

-- ============================================
-- vehicles_master table
-- ============================================
CREATE TABLE IF NOT EXISTS vehicles_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    base_model TEXT,
    year INTEGER NOT NULL,
    drive TEXT,
    transmission TEXT,
    fuel_type TEXT,
    mpg_city REAL,
    mpg_hwy REAL,
    cylinders INTEGER,
    engine_displacement REAL,
    size_class TEXT,
    search_text TEXT NOT NULL,
    embedding vector(384), -- Only if pgvector is enabled
    source_row_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for vehicles_master
CREATE INDEX IF NOT EXISTS idx_vehicles_master_make_model_year 
    ON vehicles_master (make, model, year);
CREATE INDEX IF NOT EXISTS idx_vehicles_master_year 
    ON vehicles_master (year);
CREATE INDEX IF NOT EXISTS idx_vehicles_master_size_class 
    ON vehicles_master (size_class);
CREATE INDEX IF NOT EXISTS idx_vehicles_master_search_text 
    ON vehicles_master USING gin (to_tsvector('english', search_text));

-- ============================================
-- listings table
-- ============================================
CREATE TABLE IF NOT EXISTS listings (
    listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles_master(id) ON DELETE CASCADE,
    price INTEGER NOT NULL,
    mileage INTEGER NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for listings
CREATE INDEX IF NOT EXISTS idx_listings_vehicle_id 
    ON listings (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_listings_price 
    ON listings (price);
CREATE INDEX IF NOT EXISTS idx_listings_created_at 
    ON listings (created_at);
CREATE INDEX IF NOT EXISTS idx_listings_location 
    ON listings (lat, lon);
CREATE INDEX IF NOT EXISTS idx_listings_available 
    ON listings (is_available) WHERE is_available = true;

-- ============================================
-- users_profile table (optional, for real auth users)
-- ============================================
CREATE TABLE IF NOT EXISTS users_profile (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    home_lat DOUBLE PRECISION,
    home_lon DOUBLE PRECISION,
    preferred_budget INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- interactions table (for real auth users)
-- ============================================
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(listing_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'favorite', 'purchase')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for interactions
CREATE INDEX IF NOT EXISTS idx_interactions_user_created 
    ON interactions (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_interactions_listing 
    ON interactions (listing_id);

-- ============================================
-- demo_users table (for demo data without auth)
-- ============================================
CREATE TABLE IF NOT EXISTS demo_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    home_lat DOUBLE PRECISION,
    home_lon DOUBLE PRECISION,
    preferred_budget INTEGER,
    preferred_makes TEXT[],
    preferred_size_classes TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- interactions_demo table (for demo data)
-- ============================================
CREATE TABLE IF NOT EXISTS interactions_demo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES demo_users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(listing_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'favorite', 'purchase')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for interactions_demo
CREATE INDEX IF NOT EXISTS idx_interactions_demo_user_created 
    ON interactions_demo (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_interactions_demo_listing 
    ON interactions_demo (listing_id);

-- ============================================
-- Updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vehicles_master_updated_at
    BEFORE UPDATE ON vehicles_master
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_profile_updated_at
    BEFORE UPDATE ON users_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

