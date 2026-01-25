-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_fitment ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE install_bookings ENABLE ROW LEVEL SECURITY;

-- profiles: users can only read/update their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- user_preferences: users can only access their own preferences
CREATE POLICY "Users can view own preferences"
    ON user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
    ON user_preferences FOR DELETE
    USING (auth.uid() = user_id);

-- products: public read access
CREATE POLICY "Products are viewable by everyone"
    ON products FOR SELECT
    USING (true);

-- product_variants: public read access
CREATE POLICY "Product variants are viewable by everyone"
    ON product_variants FOR SELECT
    USING (true);

-- vehicle_fitment: public read access
CREATE POLICY "Vehicle fitment is viewable by everyone"
    ON vehicle_fitment FOR SELECT
    USING (true);

-- carts: users can only access their own carts
CREATE POLICY "Users can view own carts"
    ON carts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own carts"
    ON carts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own carts"
    ON carts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own carts"
    ON carts FOR DELETE
    USING (auth.uid() = user_id);

-- cart_items: users can only access items in their own carts
CREATE POLICY "Users can view own cart items"
    ON cart_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM carts
            WHERE carts.id = cart_items.cart_id
            AND carts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own cart items"
    ON cart_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM carts
            WHERE carts.id = cart_items.cart_id
            AND carts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own cart items"
    ON cart_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM carts
            WHERE carts.id = cart_items.cart_id
            AND carts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own cart items"
    ON cart_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM carts
            WHERE carts.id = cart_items.cart_id
            AND carts.user_id = auth.uid()
        )
    );

-- orders: users can only access their own orders
CREATE POLICY "Users can view own orders"
    ON orders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
    ON orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
    ON orders FOR UPDATE
    USING (auth.uid() = user_id);

-- install_bookings: users can only access their own bookings
CREATE POLICY "Users can view own install bookings"
    ON install_bookings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own install bookings"
    ON install_bookings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own install bookings"
    ON install_bookings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own install bookings"
    ON install_bookings FOR DELETE
    USING (auth.uid() = user_id);

