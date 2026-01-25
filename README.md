# Toyota Car Marketplace - Recommendation Engine

A complete e-commerce recommendation engine for a car marketplace that ensures every search returns meaningful results, even when inventory is limited or constraints are strict.

## Features

- **Semantic Search**: Inventory-aware search using pgvector embeddings
- **Personalization**: Recommendations based on user behavior and preferences
- **Constraint Relaxation**: Progressive relaxation with explicit rationale when results are limited
- **Zero-Match Fallbacks**: Always returns results with comparables, nearby deals, and best available options
- **Budget & Location Awareness**: Filters and ranks by price and proximity

## Tech Stack

- **Next.js 14+** (App Router) with TypeScript
- **Supabase Postgres** with pgvector extension
- **Supabase Auth** for user authentication
- **Tailwind CSS** for styling
- **@xenova/transformers** for embeddings (with hashed fallback)

## Prerequisites

- Node.js 18+ and pnpm (or npm/yarn)
- Supabase account and project
- PostgreSQL with pgvector extension enabled

## Setup Instructions

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Note your project URL and API keys

### 2. Enable pgvector Extension

In your Supabase SQL Editor, run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Set Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Run Database Migrations

Option A: Using Supabase SQL Editor (Recommended for first-time setup)

1. Open Supabase SQL Editor
2. Copy and paste the contents of `supabase/migrations/001_init.sql` (or `000_complete_setup.sql` for all-in-one)
3. Run the migration
4. Copy and paste the contents of `supabase/migrations/002_rls.sql`
5. Run the RLS policies
6. Copy and paste the contents of `supabase/migrations/003_match_function.sql`
7. Run the match function
8. **NEW**: Copy and paste the contents of `supabase/migrations/005_vehicles_master.sql`
9. Run the vehicles master schema
10. Copy and paste the contents of `supabase/migrations/006_vehicles_rls.sql`
11. Run the vehicles RLS policies

Option B: Using Supabase CLI

```bash
supabase init
supabase link --project-ref your-project-ref
supabase db push
```

### 5. Install Dependencies

```bash
pnpm install
```

**Note**: The `csv-parse` package is required for importing vehicle data. It should be installed automatically.

### 6. Import Real Vehicle Data (NEW)

This project now supports importing real vehicle data from a CSV file and generating synthetic marketplace listings.

#### 6a. Download Vehicle Dataset

Download the vehicle dataset CSV file:
- URL: https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/all-vehicles-model/exports/csv?lang=en&timezone=America%2FChicago&use_labels=true&delimiter=%3B
- Save it as `all-vehicles-model.csv` in the project root directory

#### 6b. Run Data Ingestion Pipeline

Run the complete data ingestion pipeline (imports vehicles, generates listings, and seeds demo users):

```bash
pnpm run seed:all
```

This single command will:
1. Import vehicles from `all-vehicles-model.csv` into `vehicles_master` table
2. Generate synthetic marketplace listings (1-5 per vehicle)
3. Create 300 demo users with 25,000 interactions

**Individual commands** (if you want to run steps separately):

```bash
# Import vehicles only
pnpm run import:vehicles

# Generate listings only (requires vehicles to be imported first)
pnpm run gen:listings

# Seed demo users and interactions only
pnpm run seed:demo
```

#### 6c. Verify Data

After running the pipeline, verify the data in Supabase:

```sql
-- Check vehicle count (should be tens of thousands after deduplication)
SELECT COUNT(*) FROM vehicles_master;

-- Check listing count (should be 1-5 per vehicle)
SELECT COUNT(*) FROM listings;

-- Check demo users
SELECT COUNT(*) FROM demo_users;

-- Check interactions
SELECT COUNT(*) FROM interactions_demo;
```

**Expected Results**:
- `vehicles_master`: ~20,000-50,000 unique vehicles (after deduplication)
- `listings`: ~30,000-150,000 listings (1-5 per vehicle)
- `demo_users`: 300 users
- `interactions_demo`: 25,000 interactions

### 7. Generate Synthetic Data (Legacy - Optional)

```bash
pnpm run synth
```

This generates JSON files in the `data/` directory:
- `cars.json` - 3,000 car listings
- `users.json` - 300 user profiles
- `interactions.json` - 25,000 interaction events

### 8. Seed Database (Legacy - Optional)

If you're using the legacy synthetic data generation:

```bash
pnpm run seed
```

This inserts the synthetic data into your Supabase database.

**Note**: If you've already run `pnpm run seed:all`, you can skip this step as the new pipeline generates more realistic data.

### 9. Generate Embeddings

```bash
pnpm run embed
```

This computes embeddings for all cars and stores them in the database. The script uses:
- `@xenova/transformers` for transformer-based embeddings (if available)
- Hashed embedding fallback (always works, deterministic)

**Note**: The first run may take a while as it downloads the transformer model. Subsequent runs use cached models.

### 10. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Example Queries

### 1. AWD Family SUV Under $25k Within 15 Miles

```
AWD family SUV under 25k within 15 miles
```

This query should return relevant SUVs with AWD, within budget and radius. If results are limited, the system will progressively relax constraints.

### 2. Manual Transmission Hybrid Under $15k (Zero-Match Scenario)

```
manual transmission hybrid under 15k within 10 miles
```

This query is designed to trigger zero-match fallbacks. The system will:
- Relax radius
- Relax price max
- Show comparables (similar cars with automatic transmission)
- Show nearby deals
- Show best available options

### 3. Personalization Demo

1. Select a demo user from the dropdown (e.g., "User 1 (SUV Lover)")
2. Enable personalization toggle
3. Search for "family car"
4. Note how results are ranked based on user preferences
5. Switch to a different user and see how rankings change

## Project Structure

```
/
├── app/
│   ├── api/
│   │   ├── recommend/route.ts    # Recommendation API endpoint
│   │   └── track/route.ts         # Interaction tracking endpoint
│   ├── car/[id]/page.tsx          # Car detail page
│   ├── profile/page.tsx           # User profile page
│   ├── components/                # React components
│   │   ├── SearchBar.tsx
│   │   ├── Filters.tsx
│   │   ├── ResultsList.tsx
│   │   ├── CarCard.tsx
│   │   └── ExplainPanel.tsx
│   └── lib/
│       ├── supabaseServer.ts      # Supabase client setup
│       └── recommend/             # Recommendation engine
│           ├── pipeline.ts        # Main recommendation pipeline
│           ├── relaxation.ts     # Constraint relaxation logic
│           ├── scoring.ts         # Ranking and scoring
│           ├── comparables.ts     # Comparable car finder
│           ├── geo.ts             # Location utilities
│           ├── text.ts            # Text processing
│           ├── embeddings.ts      # Embedding generation
│           └── types.ts           # TypeScript types
├── scripts/
│   ├── generate_synth.ts         # Generate synthetic data (legacy)
│   ├── seed.ts                   # Seed database (legacy)
│   ├── embed.ts                  # Generate embeddings
│   ├── importVehicles.ts         # Import vehicles from CSV
│   ├── generateListings.ts       # Generate synthetic listings
│   ├── seedDemoUsers.ts          # Seed demo users and interactions
│   └── runAll.ts                 # Run complete ingestion pipeline
├── supabase/
│   └── migrations/               # Database migrations
│       ├── 001_init.sql          # Schema creation (legacy)
│       ├── 002_rls.sql           # Row Level Security
│       ├── 003_match_function.sql # pgvector search function
│       ├── 005_vehicles_master.sql # Vehicles master and listings schema
│       └── 006_vehicles_rls.sql   # Vehicles RLS policies
├── tests/                        # Test files
└── package.json
```

## Recommendation Pipeline

The recommendation engine uses a multi-stage approach:

1. **Stage 0**: Strict filters + semantic search + personalization
2. **Stage 1-6**: Progressive constraint relaxation if results < 8
   - Stage 1: Expand radius (15 → 25 → 50 → 100 miles)
   - Stage 2: Widen price max (+10%)
   - Stage 3: Widen price max (+20%)
   - Stage 4: Widen year range (±1 year)
   - Stage 5: Widen mileage (+15%)
   - Stage 6: Widen mileage (+30%)
3. **Fallbacks**: If still insufficient results
   - Comparables: Similar cars by body type, seats, price, MPG
   - Nearby Deals: Best value cars in area
   - Best Available: Top local inventory

### Ranking Formula

```
final_score = 0.45 * semantic_score
            + 0.25 * constraint_score
            + 0.20 * personal_score
            + 0.10 * inventory_score
```

## Testing

Run tests with:

```bash
pnpm test
```

Test coverage includes:
- Constraint relaxation ordering
- Zero-match fallback logic
- Personalization scoring
- Semantic search embeddings
- Hard constraint enforcement

## Database Schema

### Tables

**Legacy Tables** (from original synthetic data):
- **cars**: Car inventory with vector embeddings
- **users_profile**: User preferences and inferred profile
- **interactions**: User behavior tracking (views, favorites, purchases)

**New Tables** (from real vehicle data ingestion):
- **vehicles_master**: Master vehicle specifications from CSV import
- **listings**: Synthetic marketplace listings generated from vehicles_master
- **demo_users**: Demo user profiles (for testing without auth)
- **interactions_demo**: Demo user interactions (views, favorites, purchases)

### Key Features

- pgvector for semantic similarity search
- Row Level Security (RLS) for data protection
- Indexes optimized for common queries
- JSONB for flexible feature storage

## Troubleshooting

### Embeddings Not Working

If transformer embeddings fail, the system automatically falls back to hashed embeddings. This is deterministic and works offline.

### No Results Returned

1. Check that cars are seeded: `SELECT COUNT(*) FROM cars;`
2. Check that embeddings are generated: `SELECT COUNT(*) FROM cars WHERE embedding IS NOT NULL;`
3. Try relaxing filters or using a broader search query

### RLS Errors

Make sure you've run `002_rls.sql` to set up Row Level Security policies.

### pgvector Errors

Ensure the vector extension is enabled:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Development Notes

- The app uses service role key server-side to bypass RLS for admin operations
- Client-side uses anon key and respects RLS
- Embeddings are computed lazily (first search may be slower)
- Personalization requires user interactions to build preference vectors

## License

This project is built for Toyota's HackTamu 2026 challenge.

