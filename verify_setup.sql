-- Quick verification query - run this in Supabase SQL Editor
-- This will show you all the tables that were created

SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Expected tables:
-- cars
-- demo_users
-- interactions
-- interactions_demo
-- listings
-- users_profile
-- vehicles_master

