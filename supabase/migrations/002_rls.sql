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

