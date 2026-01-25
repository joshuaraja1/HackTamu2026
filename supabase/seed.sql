-- Seed data for e-commerce tire and oil store

-- Insert tire products
INSERT INTO products (id, title, description, category, brand, is_active) VALUES
    (gen_random_uuid(), 'All-Season Performance Tire', 'High-performance all-season tire with excellent wet and dry traction', 'tire', 'Michelin', true),
    (gen_random_uuid(), 'Winter Tire', 'Premium winter tire with superior ice and snow grip', 'tire', 'Bridgestone', true),
    (gen_random_uuid(), 'Summer Sport Tire', 'Ultra-high performance summer tire for sports cars', 'tire', 'Continental', true);

-- Insert oil products
INSERT INTO products (id, title, description, category, brand, is_active) VALUES
    (gen_random_uuid(), 'Synthetic Motor Oil 5W-30', 'Full synthetic motor oil for modern engines', 'oil', 'Mobil 1', true),
    (gen_random_uuid(), 'High Mileage Oil 10W-40', 'Synthetic blend oil designed for high-mileage vehicles', 'oil', 'Valvoline', true);

-- Insert tire variants (using subquery to get product IDs)
INSERT INTO product_variants (product_id, sku, price_cents, stock, attributes) VALUES
    -- All-Season Performance Tire variants
    ((SELECT id FROM products WHERE title = 'All-Season Performance Tire' LIMIT 1), 'TIR-AS-205-55-16', 8999, 45, '{"size": "205/55R16", "load_index": 91, "speed_rating": "V"}'),
    ((SELECT id FROM products WHERE title = 'All-Season Performance Tire' LIMIT 1), 'TIR-AS-225-50-17', 10999, 38, '{"size": "225/50R17", "load_index": 94, "speed_rating": "V"}'),
    ((SELECT id FROM products WHERE title = 'All-Season Performance Tire' LIMIT 1), 'TIR-AS-235-45-18', 12999, 32, '{"size": "235/45R18", "load_index": 98, "speed_rating": "W"}'),
    
    -- Winter Tire variants
    ((SELECT id FROM products WHERE title = 'Winter Tire' LIMIT 1), 'TIR-WIN-195-65-15', 7999, 28, '{"size": "195/65R15", "load_index": 91, "speed_rating": "T", "studdable": true}'),
    ((SELECT id FROM products WHERE title = 'Winter Tire' LIMIT 1), 'TIR-WIN-215-60-16', 9499, 22, '{"size": "215/60R16", "load_index": 95, "speed_rating": "T", "studdable": true}'),
    ((SELECT id FROM products WHERE title = 'Winter Tire' LIMIT 1), 'TIR-WIN-225-55-17', 11499, 18, '{"size": "225/55R17", "load_index": 97, "speed_rating": "H", "studdable": false}'),
    
    -- Summer Sport Tire variants
    ((SELECT id FROM products WHERE title = 'Summer Sport Tire' LIMIT 1), 'TIR-SUM-245-40-18', 14999, 15, '{"size": "245/40R18", "load_index": 97, "speed_rating": "Y"}'),
    ((SELECT id FROM products WHERE title = 'Summer Sport Tire' LIMIT 1), 'TIR-SUM-255-35-19', 17999, 12, '{"size": "255/35R19", "load_index": 96, "speed_rating": "Y"}'),
    ((SELECT id FROM products WHERE title = 'Summer Sport Tire' LIMIT 1), 'TIR-SUM-275-30-20', 19999, 8, '{"size": "275/30R20", "load_index": 97, "speed_rating": "Y"}');

-- Insert oil variants
INSERT INTO product_variants (product_id, sku, price_cents, stock, attributes) VALUES
    -- Synthetic Motor Oil 5W-30 variants
    ((SELECT id FROM products WHERE title = 'Synthetic Motor Oil 5W-30' LIMIT 1), 'OIL-5W30-1QT', 899, 150, '{"viscosity": "5W-30", "volume_quarts": 1, "type": "full_synthetic"}'),
    ((SELECT id FROM products WHERE title = 'Synthetic Motor Oil 5W-30' LIMIT 1), 'OIL-5W30-5QT', 3999, 85, '{"viscosity": "5W-30", "volume_quarts": 5, "type": "full_synthetic"}'),
    ((SELECT id FROM products WHERE title = 'Synthetic Motor Oil 5W-30' LIMIT 1), 'OIL-5W30-12QT', 8999, 42, '{"viscosity": "5W-30", "volume_quarts": 12, "type": "full_synthetic"}'),
    
    -- High Mileage Oil 10W-40 variants
    ((SELECT id FROM products WHERE title = 'High Mileage Oil 10W-40' LIMIT 1), 'OIL-10W40-1QT', 749, 120, '{"viscosity": "10W-40", "volume_quarts": 1, "type": "synthetic_blend", "high_mileage": true}'),
    ((SELECT id FROM products WHERE title = 'High Mileage Oil 10W-40' LIMIT 1), 'OIL-10W40-5QT', 3299, 65, '{"viscosity": "10W-40", "volume_quarts": 5, "type": "synthetic_blend", "high_mileage": true}');

-- Insert vehicle fitment examples
INSERT INTO vehicle_fitment (vehicle_key, specs) VALUES
    ('2020_Honda_Civic_Sedan', '{"make": "Honda", "model": "Civic", "year": 2020, "trim": "Sedan", "tire_size": "205/55R16", "oil_viscosity": "0W-20", "oil_capacity_quarts": 3.7}'),
    ('2018_Toyota_Camry_LE', '{"make": "Toyota", "model": "Camry", "year": 2018, "trim": "LE", "tire_size": "215/60R16", "oil_viscosity": "0W-20", "oil_capacity_quarts": 4.6}'),
    ('2022_Ford_F150_XLT', '{"make": "Ford", "model": "F-150", "year": 2022, "trim": "XLT", "tire_size": "275/55R20", "oil_viscosity": "5W-30", "oil_capacity_quarts": 6.0}'),
    ('2019_Chevrolet_Silverado_1500', '{"make": "Chevrolet", "model": "Silverado 1500", "year": 2019, "trim": "LT", "tire_size": "265/70R17", "oil_viscosity": "5W-30", "oil_capacity_quarts": 6.0}'),
    ('2021_BMW_3_Series', '{"make": "BMW", "model": "3 Series", "year": 2021, "trim": "330i", "tire_size": "225/45R18", "oil_viscosity": "5W-30", "oil_capacity_quarts": 5.0}'),
    ('2017_Audi_A4', '{"make": "Audi", "model": "A4", "year": 2017, "trim": "Premium", "tire_size": "245/40R18", "oil_viscosity": "5W-40", "oil_capacity_quarts": 4.8}');

