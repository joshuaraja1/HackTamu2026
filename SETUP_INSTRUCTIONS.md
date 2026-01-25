# 🚀 Quick Database Setup Guide

## Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

## Step 2: Copy and Paste the Setup SQL

1. Open the file `supabase/COMPLETE_SETUP.sql` in this project
2. **Copy the ENTIRE contents** of that file
3. **Paste it into the Supabase SQL Editor**
4. Click the **Run** button (or press Cmd/Ctrl + Enter)

## Step 3: Verify Setup

After running the SQL, verify everything worked by running this query in the SQL Editor:

```sql
-- Check that all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see these tables:
- `cars`
- `demo_users`
- `interactions`
- `interactions_demo`
- `listings`
- `users_profile`
- `vehicles_master`

## Step 4: Install Dependencies

In your terminal, run:

```bash
pnpm install
```

This will install the `csv-parse` package needed for importing vehicles.

## Step 5: Download Vehicle Data

Download the vehicle dataset CSV:

1. Go to: https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/all-vehicles-model/exports/csv?lang=en&timezone=America%2FChicago&use_labels=true&delimiter=%3B
2. Save the file as `all-vehicles-model.csv` in your project root directory (same folder as `package.json`)

## Step 6: Run Data Ingestion

Run this single command to import everything:

```bash
pnpm run seed:all
```

This will:
- Import vehicles from the CSV
- Generate synthetic marketplace listings
- Create 300 demo users with 25,000 interactions

**Expected time**: 5-15 minutes depending on your connection

## Step 7: Verify Data

In Supabase SQL Editor, run:

```sql
-- Check counts
SELECT 
  'vehicles_master' as table_name, COUNT(*) as count FROM vehicles_master
UNION ALL
SELECT 'listings', COUNT(*) FROM listings
UNION ALL
SELECT 'demo_users', COUNT(*) FROM demo_users
UNION ALL
SELECT 'interactions_demo', COUNT(*) FROM interactions_demo;
```

Expected results:
- `vehicles_master`: ~20,000-50,000 vehicles
- `listings`: ~30,000-150,000 listings
- `demo_users`: 300 users
- `interactions_demo`: 25,000 interactions

## ✅ You're Done!

Your database is now fully set up and populated. You can start your app:

```bash
pnpm dev
```

## Troubleshooting

### "Extension vector does not exist"
- This is okay! The setup will continue without pgvector
- To enable it later, go to Database → Extensions in Supabase and enable "vector"

### "Table already exists" errors
- This means you've run the setup before
- The script uses `IF NOT EXISTS` so it's safe to run multiple times
- You can ignore these messages

### Import fails with "file not found"
- Make sure `all-vehicles-model.csv` is in the project root
- Check the file name is exactly `all-vehicles-model.csv` (case-sensitive)

### Need to start over?
If you want to clear everything and start fresh:

```sql
-- WARNING: This deletes ALL data!
DROP TABLE IF EXISTS interactions_demo CASCADE;
DROP TABLE IF EXISTS interactions CASCADE;
DROP TABLE IF EXISTS demo_users CASCADE;
DROP TABLE IF EXISTS listings CASCADE;
DROP TABLE IF EXISTS vehicles_master CASCADE;
DROP TABLE IF EXISTS cars CASCADE;
DROP TABLE IF EXISTS users_profile CASCADE;
```

Then run `COMPLETE_SETUP.sql` again.

