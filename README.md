# 🚗 Car Marketplace - AI-Powered Recommendation Engine

A complete e-commerce recommendation engine for a car marketplace that ensures every search returns meaningful results, even when inventory is limited or constraints are strict. Built for Toyota's challenge at HackTamu 2026.

## ✨ Features

### Core Recommendation Engine
- **Semantic Search**: Inventory-aware search using pgvector embeddings
- **Personalization**: Recommendations based on user behavior and preferences
- **Constraint Relaxation**: Progressive relaxation with explicit rationale when results are limited
- **Zero-Match Fallbacks**: Always returns results with comparables, nearby deals, and best available options
- **Budget & Location Awareness**: Filters and ranks by price and proximity

### User Features
- **Smart Search**: Natural language search queries (e.g., "AWD family SUV under 25k Dallas")
- **Advanced Filtering**: Filter by make, model, year, price, mileage, drivetrain, fuel type, transmission, seats, features, and location
- **Compare Feature**: Add up to 4 cars to compare with:
  - Detailed metrics comparison table
  - Visual charts (Price, MPG, Mileage, Overall Radar)
  - AI-powered analysis and recommendations
- **Car Details**: View detailed information about each car
- **Favorites**: Save cars you're interested in

## 🛠 Tech Stack

- **Frontend**: Next.js 14+ (App Router) with TypeScript, React 18
- **Backend**: Next.js API Routes (Route Handlers)
- **Database**: Supabase Postgres with pgvector extension
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Embeddings**: @xenova/transformers (with hashed fallback)
- **Data Processing**: csv-parse for vehicle data ingestion

## 📋 Prerequisites

- Node.js 18+ 
- pnpm (or npm/yarn)
- Supabase account and project
- PostgreSQL with pgvector extension enabled

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/joshuaraja1/HackTamu2026.git
cd HackTamu2026
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Supabase

1. Create a new project at [Supabase Dashboard](https://supabase.com/dashboard)
2. Enable the `vector` extension in SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### 4. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Resend Email API (for test drive confirmations)
# Get your API key from https://resend.com/api-keys
RESEND_API_KEY=re_your_api_key_here
# For testing, use onboarding@resend.dev (works immediately)
# For production, use your verified domain
RESEND_FROM_EMAIL=Car Marketplace <onboarding@resend.dev>
```

### 5. Run Database Migrations

**Option A: Using Supabase SQL Editor (Recommended)**

1. Open Supabase SQL Editor
2. Run `supabase/migrations/005_vehicles_master.sql` (creates vehicles_master and listings tables)
3. Run `supabase/migrations/006_vehicles_rls.sql` (sets up RLS policies)
4. Run `supabase/migrations/003_match_function.sql` (creates pgvector match function)
5. Run `supabase/migrations/004_vector_index.sql` (creates vector index for performance)

**Option B: Using Supabase CLI**

```bash
supabase init
supabase link --project-ref your-project-ref
supabase db push
```

### 6. Import Vehicle Data

The project includes a real vehicle dataset (`all-vehicles-model.csv`) with 47,000+ vehicle models.

**Import vehicles and generate listings:**

```bash
# Import vehicles from CSV
pnpm run import:vehicles

# Generate synthetic marketplace listings
pnpm run gen:listings

# (Optional) Seed demo users and interactions
pnpm run seed:demo

# Or run all at once:
pnpm run seed:all
```

This will:
- Import ~43,000 vehicles from the CSV into `vehicles_master`
- Generate ~60,000+ synthetic listings with realistic prices, mileage, locations, and features
- Create demo users and interaction data for personalization testing

### 7. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
HackTamu2026/
├── app/
│   ├── api/
│   │   ├── recommend/      # Recommendation API endpoint
│   │   └── track/           # User interaction tracking
│   ├── car/[id]/           # Car detail page
│   ├── compare/             # Car comparison page
│   ├── profile/             # User profile page
│   ├── components/          # React components
│   │   ├── CarCard.tsx      # Individual car card
│   │   ├── ComparePanel.tsx # Compare panel (bottom bar)
│   │   ├── Filters.tsx      # Filter sidebar
│   │   ├── ResultsList.tsx  # Results display
│   │   └── SearchBar.tsx    # Search input
│   ├── context/
│   │   └── CompareContext.tsx # Compare state management
│   └── lib/
│       ├── recommend/       # Recommendation engine
│       │   ├── pipeline.ts  # Main recommendation pipeline
│       │   ├── queryParser.ts # Natural language parsing
│       │   ├── embeddings.ts # Embedding generation
│       │   ├── scoring.ts   # Ranking algorithms
│       │   ├── relaxation.ts # Constraint relaxation
│       │   └── ...
│       └── supabaseServer.ts # Supabase client
├── scripts/
│   ├── importVehicles.ts    # Import CSV data
│   ├── generateListings.ts  # Generate synthetic listings
│   ├── seedDemoUsers.ts     # Seed demo data
│   └── runAll.ts            # Run all scripts
├── supabase/
│   └── migrations/          # Database migrations
├── tests/                    # Test files
└── all-vehicles-model.csv    # Vehicle dataset (47K+ rows)
```

## 🎯 Usage Examples

### Search Queries

Try these natural language queries:

- `"AWD family SUV under 25k within 15 miles"`
- `"Toyota Camry 2020 under 25k AWD"`
- `"reliable sedan with good gas mileage"`
- `"luxury car with heated seats"`

### Compare Cars

1. Click the heart icon (❤️) on any car card to add it to compare
2. Add up to 4 cars
3. Click "View Comparison" in the bottom panel
4. See detailed metrics, charts, and AI-powered analysis

## 🔧 Available Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server

# Data Management
pnpm run import:vehicles    # Import vehicles from CSV
pnpm run gen:listings       # Generate synthetic listings
pnpm run seed:demo          # Seed demo users/interactions
pnpm run seed:all           # Run all data scripts

# Testing
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
```

## 🧪 Testing

The project includes comprehensive tests:

- `tests/relaxation.test.ts` - Constraint relaxation logic
- `tests/zeroMatch.test.ts` - Zero-match fallback scenarios
- `tests/personalization.test.ts` - Personalization ranking
- `tests/semantic.test.ts` - Semantic search
- `tests/hardConstraints.test.ts` - Hard constraint enforcement

Run tests with:

```bash
pnpm test
```

## 📊 Database Schema

### Main Tables

- **`vehicles_master`**: Master vehicle specifications (make, model, year, specs)
- **`listings`**: Marketplace listings (price, mileage, location, features)
- **`users_profile`**: User preferences and profiles
- **`interactions_demo`**: User interaction history (views, favorites, purchases)

### Key Features

- Vector embeddings stored in `vehicles_master.embedding` for semantic search
- Full-text search on `search_text` column
- Row Level Security (RLS) enabled on all tables
- Optimized indexes for performance

## 🎨 UI Features

- **Modern Design**: Gradient backgrounds, smooth animations, responsive layout
- **Smart Filters**: Collapsible filter panel with active filter count
- **Visual Feedback**: Loading states, empty states, error handling
- **Compare Panel**: Floating bottom panel showing compare cars
- **Charts & Analysis**: Interactive charts for comparing cars

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Service role key only used server-side
- Anon key used client-side with RLS enforcement
- Environment variables for sensitive credentials

## 📝 License

This project was built for HackTamu 2026.

## 🤝 Contributing

This is a hackathon project. Feel free to fork and extend!

## 📧 Contact

For questions or issues, please open an issue on GitHub.

---

**Built with ❤️ for Toyota's challenge at HackTamu 2026**
