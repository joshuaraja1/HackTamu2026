-- ============================================
-- COMPLETE DATABASE SETUP
-- Paste this entire file into Supabase SQL Editor
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- cars table (inventory)
CREATE TABLE cars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    trim TEXT,
    year INTEGER NOT NULL CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM NOW()) + 1),
    body_type TEXT NOT NULL, -- sedan, suv, truck, coupe, hatchback, wagon
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    mileage INTEGER NOT NULL CHECK (mileage >= 0),
    drivetrain TEXT, -- fwd, rwd, awd, 4wd
    fuel_type TEXT, -- gas, hybrid, electric, diesel
    transmission TEXT, -- automatic, manual, cvt
    engine TEXT,
    mpg_city INTEGER,
    mpg_highway INTEGER,
    seats INTEGER CHECK (seats > 0),
    doors INTEGER CHECK (doors > 0),
    color TEXT,
    vin TEXT UNIQUE,
    features TEXT[], -- array of features like CarPlay, heated_seats, lane_assist, etc.
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
    -- Vector embedding for semantic search (384 dimensions for lightweight models)
    embedding vector(384)
);

-- users_profile table (user preferences)
CREATE TABLE users_profile (
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
    -- Computed preference vector from interactions
    preference_vector vector(384),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- interactions table (user behavior tracking)
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'favorite', 'purchase', 'search')),
    metadata JSONB, -- additional context like query text, filters, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_cars_make_model ON cars(make, model);
CREATE INDEX idx_cars_year ON cars(year);
CREATE INDEX idx_cars_body_type ON cars(body_type);
CREATE INDEX idx_cars_price_cents ON cars(price_cents);
CREATE INDEX idx_cars_mileage ON cars(mileage);
CREATE INDEX idx_cars_city_state ON cars(city, state);
CREATE INDEX idx_cars_is_available ON cars(is_available);
CREATE INDEX idx_cars_location ON cars USING GIST (point(longitude, latitude));

-- Note: Vector index will be created after embeddings are added
-- CREATE INDEX idx_cars_embedding ON cars USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_users_profile_zip ON users_profile(zip);
CREATE INDEX idx_users_profile_location ON users_profile USING GIST (point(longitude, latitude));

CREATE INDEX idx_interactions_user_id ON interactions(user_id);
CREATE INDEX idx_interactions_car_id ON interactions(car_id);
CREATE INDEX idx_interactions_type ON interactions(interaction_type);
CREATE INDEX idx_interactions_created_at ON interactions(created_at);
CREATE INDEX idx_interactions_user_type ON interactions(user_id, interaction_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_profile_updated_at BEFORE UPDATE ON users_profile
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable Row Level Security
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- PGVECTOR SEARCH FUNCTION
-- ============================================

-- Create function for pgvector similarity search
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

