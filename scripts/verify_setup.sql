-- Verification queries to check if everything was created properly

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('cars', 'users_profile', 'interactions')
ORDER BY table_name;

-- Check if extensions are enabled
SELECT extname, extversion 
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'vector');

-- Check if function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'match_cars';

-- Check if indexes exist on cars table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'cars'
ORDER BY indexname;

-- Count policies (should be 6 total)
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

