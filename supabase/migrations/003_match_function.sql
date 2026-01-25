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
  trim text,
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
    cars.trim,
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

