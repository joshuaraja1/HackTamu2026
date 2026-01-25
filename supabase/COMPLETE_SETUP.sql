-- ============================================
-- COMPLETE SUPABASE DATABASE SETUP
-- ============================================
-- Copy and paste this ENTIRE file into Supabase SQL Editor
-- Then click "Run" to set up your database
-- ============================================

-- ============================================
-- STEP 1: Enable Extensions
-- ============================================
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
-- STEP 2: Create Original Tables (cars, users_profile, interactions)
-- ============================================

-- cars table (inventory)
CREATE TABLE IF NOT EXISTS cars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    trim TEXT,
    year INTEGER NOT NULL CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM NOW()) + 1),
    body_type TEXT NOT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    mileage INTEGER NOT NULL CHECK (mileage >= 0),
    drivetrain TEXT,
    fuel_type TEXT,
    transmission TEXT,
    engine TEXT,
    mpg_city INTEGER,
    mpg_highway INTEGER,
    seats INTEGER CHECK (seats > 0),
    doors INTEGER CHECK (doors > 0),
    color TEXT,
    vin TEXT UNIQUE,
    features TEXT[],
    description TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    seller_name TEXT,
    seller_phone TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    embedding vector(384)
);

-- users_profile table (user preferences)
CREATE TABLE IF NOT EXISTS users_profile (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    zip TEXT,
    city TEXT,
    state TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    budget_min_cents INTEGER CHECK (budget_min_cents >= 0),
    budget_max_cents INTEGER CHECK (budget_max_cents >= 0),
    preferred_makes TEXT[],
    preferred_body_types TEXT[],
    preferred_features TEXT[],
    max_distance_miles INTEGER DEFAULT 25,
    preference_vector vector(384),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- interactions table (user behavior tracking)
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'favorite', 'purchase', 'search')),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- STEP 3: Create New Tables (vehicles_master, listings, demo_users)
-- ============================================

-- vehicles_master table
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
    embedding vector(384),
    source_row_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- listings table
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

-- demo_users table (for demo data without auth)
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

-- interactions_demo table (for demo data)
CREATE TABLE IF NOT EXISTS interactions_demo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES demo_users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(listing_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'favorite', 'purchase')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 4: Create Indexes
-- ============================================

-- Indexes for cars table
CREATE INDEX IF NOT EXISTS idx_cars_make_model ON cars(make, model);
CREATE INDEX IF NOT EXISTS idx_cars_year ON cars(year);
CREATE INDEX IF NOT EXISTS idx_cars_body_type ON cars(body_type);
CREATE INDEX IF NOT EXISTS idx_cars_price_cents ON cars(price_cents);
CREATE INDEX IF NOT EXISTS idx_cars_mileage ON cars(mileage);
CREATE INDEX IF NOT EXISTS idx_cars_city_state ON cars(city, state);
CREATE INDEX IF NOT EXISTS idx_cars_is_available ON cars(is_available);
CREATE INDEX IF NOT EXISTS idx_cars_location ON cars USING GIST (point(longitude, latitude));

-- Indexes for users_profile
CREATE INDEX IF NOT EXISTS idx_users_profile_zip ON users_profile(zip);
CREATE INDEX IF NOT EXISTS idx_users_profile_location ON users_profile USING GIST (point(longitude, latitude));

-- Indexes for interactions
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_car_id ON interactions(car_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_interactions_user_type ON interactions(user_id, interaction_type);

-- Indexes for vehicles_master
CREATE INDEX IF NOT EXISTS idx_vehicles_master_make_model_year ON vehicles_master (make, model, year);
CREATE INDEX IF NOT EXISTS idx_vehicles_master_year ON vehicles_master (year);
CREATE INDEX IF NOT EXISTS idx_vehicles_master_size_class ON vehicles_master (size_class);
CREATE INDEX IF NOT EXISTS idx_vehicles_master_search_text ON vehicles_master USING gin (to_tsvector('english', search_text));

-- Indexes for listings
CREATE INDEX IF NOT EXISTS idx_listings_vehicle_id ON listings (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings (price);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings (created_at);
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings (lat, lon);
CREATE INDEX IF NOT EXISTS idx_listings_available ON listings (is_available) WHERE is_available = true;

-- Indexes for interactions_demo
CREATE INDEX IF NOT EXISTS idx_interactions_demo_user_created ON interactions_demo (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_interactions_demo_listing ON interactions_demo (listing_id);

-- Vector index for cars (only if pgvector is enabled)
DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS idx_cars_embedding ON cars USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    RAISE NOTICE 'Vector index created for cars';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Vector index not created (pgvector may not be enabled)';
END $$;

-- ============================================
-- STEP 5: Create Functions and Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_cars_updated_at ON cars;
CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_profile_updated_at ON users_profile;
CREATE TRIGGER update_users_profile_updated_at BEFORE UPDATE ON users_profile
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_master_updated_at ON vehicles_master;
CREATE TRIGGER update_vehicles_master_updated_at BEFORE UPDATE ON vehicles_master
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function for pgvector similarity search
CREATE OR REPLACE FUNCTION match_cars(
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  make text,
  model text,
  "trim" text,
  year integer,
  body_type text,
  price_cents integer,
  mileage integer,
  drivetrain text,
  fuel_type text,
  transmission text,
  engine text,
  mpg_city integer,
  mpg_highway integer,
  seats integer,
  doors integer,
  color text,
  vin text,
  features text[],
  description text,
  city text,
  state text,
  zip text,
  latitude decimal,
  longitude decimal,
  seller_name text,
  seller_phone text,
  is_available boolean,
  created_at timestamptz,
  updated_at timestamptz,
  embedding vector(384)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cars.id,
    cars.make,
    cars.model,
    cars."trim",
    cars.year,
    cars.body_type,
    cars.price_cents,
    cars.mileage,
    cars.drivetrain,
    cars.fuel_type,
    cars.transmission,
    cars.engine,
    cars.mpg_city,
    cars.mpg_highway,
    cars.seats,
    cars.doors,
    cars.color,
    cars.vin,
    cars.features,
    cars.description,
    cars.city,
    cars.state,
    cars.zip,
    cars.latitude,
    cars.longitude,
    cars.seller_name,
    cars.seller_phone,
    cars.is_available,
    cars.created_at,
    cars.updated_at,
    cars.embedding
  FROM cars
  WHERE cars.is_available = true
    AND cars.embedding IS NOT NULL
    AND 1 - (cars.embedding <=> query_embedding) > match_threshold
  ORDER BY cars.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- STEP 6: Enable Row Level Security (RLS)
-- ============================================

-- Enable RLS on tables that need it
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions_demo ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 7: Create RLS Policies
-- ============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Cars are viewable by everyone" ON cars;
DROP POLICY IF EXISTS "Users can view own profile" ON users_profile;
DROP POLICY IF EXISTS "Users can update own profile" ON users_profile;
DROP POLICY IF EXISTS "Users can insert own profile" ON users_profile;
DROP POLICY IF EXISTS "Users can view own interactions" ON interactions;
DROP POLICY IF EXISTS "Users can insert own interactions" ON interactions;
DROP POLICY IF EXISTS "Users can update own interactions" ON interactions;
DROP POLICY IF EXISTS "vehicles_master_public_read" ON vehicles_master;
DROP POLICY IF EXISTS "listings_public_read" ON listings;
DROP POLICY IF EXISTS "users_profile_select_own" ON users_profile;
DROP POLICY IF EXISTS "users_profile_update_own" ON users_profile;
DROP POLICY IF EXISTS "users_profile_insert_own" ON users_profile;
DROP POLICY IF EXISTS "interactions_select_own" ON interactions;
DROP POLICY IF EXISTS "interactions_insert_own" ON interactions;

-- cars: public read access
CREATE POLICY "Cars are viewable by everyone"
    ON cars FOR SELECT
    USING (true);

-- users_profile: users can only access their own profile
CREATE POLICY "Users can view own profile"
    ON users_profile FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON users_profile FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON users_profile FOR INSERT
    WITH CHECK (auth.uid() = id);

-- interactions: users can only access their own interactions
CREATE POLICY "Users can view own interactions"
    ON interactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions"
    ON interactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interactions"
    ON interactions FOR UPDATE
    USING (auth.uid() = user_id);

-- vehicles_master: public read
CREATE POLICY "vehicles_master_public_read" ON vehicles_master
    FOR SELECT
    USING (true);

-- listings: public read
CREATE POLICY "listings_public_read" ON listings
    FOR SELECT
    USING (true);

-- users_profile policies (for new schema)
CREATE POLICY "users_profile_select_own" ON users_profile
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "users_profile_update_own" ON users_profile
    FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "users_profile_insert_own" ON users_profile
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- interactions policies (for new schema with listings)
CREATE POLICY "interactions_select_own" ON interactions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "interactions_insert_own" ON interactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Your database is now fully configured.
-- 
-- Next steps:
-- 1. Verify tables exist: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- 2. Run: pnpm install
-- 3. Download all-vehicles-model.csv to project root
-- 4. Run: pnpm run seed:all
-- ============================================

