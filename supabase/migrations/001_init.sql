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
CREATE INDEX idx_cars_embedding ON cars USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

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
