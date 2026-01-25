# Supabase Database Setup

This directory contains the database schema, migrations, Row Level Security policies, and seed data for the e-commerce tire and oil store.

## File Structure

- `migrations/001_init.sql` - Initial database schema with all tables, enums, and indexes
- `rls.sql` - Row Level Security policies for all tables
- `seed.sql` - Sample data for products, variants, and vehicle fitments
- `README_DB.md` - This file

## Setup Instructions

### Option 1: Using Supabase SQL Editor (Recommended for Quick Setup)

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run Migration**
   - Copy the entire contents of `migrations/001_init.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute

3. **Enable RLS**
   - Copy the entire contents of `rls.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute

4. **Seed Data (Optional)**
   - Copy the entire contents of `seed.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute

### Option 2: Using Supabase CLI (Recommended for Production)

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Initialize Supabase (if not already done)**
   ```bash
   supabase init
   ```

3. **Link to Your Project**
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Run Migrations**
   ```bash
   supabase db push
   ```
   This will apply all migrations in the `migrations/` directory.

5. **Apply RLS Policies**
   ```bash
   supabase db push
   ```
   Or manually run `rls.sql` in the SQL Editor.

6. **Seed Data (Optional)**
   ```bash
   supabase db seed
   ```
   Or manually run `seed.sql` in the SQL Editor.

## Database Schema Overview

### Core Tables

- **profiles** - User profile information linked to Supabase auth
- **user_preferences** - User shopping preferences (zip, vehicle, budget, priorities)
- **products** - Product catalog (tires, oil, other)
- **product_variants** - Product variations (sizes, viscosities, SKUs, pricing)
- **vehicle_fitment** - Vehicle specifications for compatibility matching
- **carts** - Shopping carts
- **cart_items** - Items in shopping carts
- **orders** - Customer orders
- **install_bookings** - Installation appointment bookings

### Security

Row Level Security (RLS) is enabled on all tables:
- **Public Read**: `products`, `product_variants`, `vehicle_fitment`
- **Owner Only**: All other tables require `auth.uid() = user_id`

### Enums

- `product_category`: 'tire', 'oil', 'other'
- `cart_status`: 'active', 'converted', 'abandoned'
- `order_status`: 'pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'

## Notes

- All prices are stored in cents (integer) to avoid floating-point precision issues
- UUIDs are generated using `gen_random_uuid()`
- Foreign keys use `ON DELETE CASCADE` or `ON DELETE SET NULL` as appropriate
- Timestamps use `TIMESTAMPTZ` for timezone-aware dates
- JSONB fields are used for flexible data storage (vehicle info, tire attributes, etc.)

## Troubleshooting

If you encounter errors:

1. **Check Extensions**: Ensure `uuid-ossp` extension is enabled (included in migration)
2. **Verify Auth**: Make sure Supabase Auth is set up in your project
3. **Check Permissions**: Ensure you have the necessary permissions to create tables and policies
4. **Review Logs**: Check Supabase logs for detailed error messages

## Next Steps

After setting up the database:

1. Configure your application to connect to Supabase
2. Set up authentication in your frontend
3. Implement API endpoints or use Supabase client libraries
4. Test RLS policies with different user roles

