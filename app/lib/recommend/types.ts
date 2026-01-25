export interface Car {
  id: string;
  make: string;
  model: string;
  trim?: string;
  year: number;
  body_type: string;
  price_cents: number;
  mileage: number;
  drivetrain?: string;
  fuel_type?: string;
  transmission?: string;
  engine?: string;
  mpg_city?: number;
  mpg_highway?: number;
  seats?: number;
  doors?: number;
  color?: string;
  vin?: string;
  features?: string[];
  description?: string;
  city: string;
  state: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  seller_name?: string;
  seller_phone?: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  embedding?: number[];
}

export interface UserProfile {
  id: string;
  full_name?: string;
  email?: string;
  zip?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  budget_min_cents?: number;
  budget_max_cents?: number;
  preferred_makes?: string[];
  preferred_body_types?: string[];
  preferred_features?: string[];
  max_distance_miles?: number;
  preference_vector?: number[];
}

export interface SearchFilters {
  queryText?: string;
  budgetMin?: number;
  budgetMax?: number;
  make?: string[];
  model?: string[];
  bodyType?: string[];
  yearMin?: number;
  yearMax?: number;
  mileageMax?: number;
  drivetrain?: string[];
  fuelType?: string[];
  transmission?: string[];
  seats?: number;
  features?: string[];
  radiusMiles?: number;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  hardConstraints?: string[]; // e.g., ['fuel_type', 'drivetrain']
}

export interface Relaxation {
  constraint: string;
  from: string | number;
  to: string | number;
  rationale: string;
}

export interface RecommendationResult {
  car: Car;
  score: number;
  reasons: string[];
  semantic_score?: number;
  constraint_score?: number;
  personal_score?: number;
  inventory_score?: number;
}

export interface RecommendationResponse {
  results: RecommendationResult[];
  relaxation_applied: Relaxation[];
  alternatives: {
    comparables: Array<{ car: Car; similarity_reason: string }>;
    nearby_deals: Array<{ car: Car; reason: string }>;
    best_available: Array<{ car: Car; reason: string }>;
  };
  debug?: {
    stage_counts: Record<string, number>;
    top_signals: string[];
    final_stage: string;
  };
}

