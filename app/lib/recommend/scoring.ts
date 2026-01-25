import type { Car, UserProfile, SearchFilters } from './types';
import { cosineSimilarity } from './utils';
import { distanceScore } from './geo';

/**
 * Calculate constraint fit score (0-1)
 * Rewards closeness to constraints, not just pass/fail
 */
export function calculateConstraintScore(
  car: Car,
  filters: SearchFilters,
  userProfile?: UserProfile
): number {
  let score = 1.0;
  const factors: number[] = [];

  // Price constraint
  if (filters.budgetMax !== undefined) {
    const price = car.price_cents;
    if (price > filters.budgetMax) {
      return 0; // Hard fail
    }
    // Reward being closer to max budget (but not over)
    const ratio = price / filters.budgetMax;
    factors.push(0.5 + 0.5 * ratio); // 0.5 to 1.0
  } else if (userProfile?.budget_max_cents) {
    const price = car.price_cents;
    if (price > userProfile.budget_max_cents) {
      return 0;
    }
    const ratio = price / userProfile.budget_max_cents;
    factors.push(0.5 + 0.5 * ratio);
  }

  if (filters.budgetMin !== undefined) {
    if (car.price_cents < filters.budgetMin) {
      return 0;
    }
  }

  // Year constraint
  if (filters.yearMin !== undefined) {
    if (car.year < filters.yearMin) {
      return 0;
    }
    const yearRange = (filters.yearMax || new Date().getFullYear()) - filters.yearMin;
    if (yearRange > 0) {
      const yearRatio = (car.year - filters.yearMin) / yearRange;
      factors.push(0.7 + 0.3 * yearRatio);
    }
  }

  if (filters.yearMax !== undefined) {
    if (car.year > filters.yearMax) {
      return 0;
    }
  }

  // Mileage constraint
  if (filters.mileageMax !== undefined) {
    if (car.mileage > filters.mileageMax) {
      return 0;
    }
    const ratio = 1 - (car.mileage / filters.mileageMax);
    factors.push(0.6 + 0.4 * ratio);
  }

  // Location/radius constraint
  if (filters.latitude && filters.longitude && filters.radiusMiles) {
    const distScore = distanceScore(
      car.latitude || null,
      car.longitude || null,
      filters.latitude,
      filters.longitude,
      filters.radiusMiles
    );
    factors.push(distScore);
  } else if (userProfile?.latitude && userProfile?.longitude && userProfile?.max_distance_miles) {
    const distScore = distanceScore(
      car.latitude || null,
      car.longitude || null,
      userProfile.latitude,
      userProfile.longitude,
      userProfile.max_distance_miles
    );
    factors.push(distScore);
  }

  // Categorical matches - these are hard filters, return 0 if not matching
  if (filters.make && filters.make.length > 0) {
    if (!filters.make.includes(car.make)) {
      return 0; // Hard fail - make doesn't match
    }
    factors.push(1.0);
  }

  if (filters.bodyType && filters.bodyType.length > 0) {
    if (!filters.bodyType.includes(car.body_type)) {
      return 0; // Hard fail - body type doesn't match
    }
    factors.push(1.0);
  }

  if (filters.drivetrain && filters.drivetrain.length > 0) {
    if (!car.drivetrain || !filters.drivetrain.includes(car.drivetrain)) {
      return 0; // Hard fail - drivetrain doesn't match
    }
    factors.push(1.0);
  }

  if (filters.fuelType && filters.fuelType.length > 0) {
    if (!car.fuel_type || !filters.fuelType.includes(car.fuel_type)) {
      return 0; // Hard fail - fuel type doesn't match
    }
    factors.push(1.0);
  }

  if (filters.seats) {
    if (car.seats && car.seats >= filters.seats) {
      factors.push(1.0);
    } else {
      factors.push(0.3);
    }
  }

  // Feature overlap
  if (filters.features && filters.features.length > 0 && car.features) {
    const overlap = filters.features.filter(f => car.features!.includes(f)).length;
    const featureScore = overlap / filters.features.length;
    factors.push(0.5 + 0.5 * featureScore);
  }

  // Average all factors
  if (factors.length > 0) {
    score = factors.reduce((sum, f) => sum + f, 0) / factors.length;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate personal affinity score (0-1)
 */
export function calculatePersonalScore(
  car: Car,
  userProfile?: UserProfile,
  userPreferenceVector?: number[]
): number {
  if (!userProfile && !userPreferenceVector) return 0.5; // Neutral

  let score = 0;
  let factors = 0;

  // Preference vector similarity
  if (userPreferenceVector && car.embedding) {
    const similarity = cosineSimilarity(userPreferenceVector, car.embedding);
    score += similarity * 0.6;
    factors += 0.6;
  }

  // Make preference
  if (userProfile?.preferred_makes && userProfile.preferred_makes.length > 0) {
    if (userProfile.preferred_makes.includes(car.make)) {
      score += 0.3;
    }
    factors += 0.3;
  }

  // Body type preference
  if (userProfile?.preferred_body_types && userProfile.preferred_body_types.length > 0) {
    if (userProfile.preferred_body_types.includes(car.body_type)) {
      score += 0.1;
    }
    factors += 0.1;
  }

  // Feature preference overlap
  if (userProfile?.preferred_features && userProfile.preferred_features.length > 0 && car.features) {
    const overlap = userProfile.preferred_features.filter(f => car.features!.includes(f)).length;
    const featureScore = overlap / userProfile.preferred_features.length;
    score += featureScore * 0.1;
    factors += 0.1;
  }

  if (factors === 0) return 0.5;

  return Math.max(0, Math.min(1, score / factors));
}

/**
 * Calculate inventory boost score (0-1)
 * Boosts models with more local availability
 */
export function calculateInventoryScore(
  car: Car,
  similarCarsInArea: number,
  maxSimilar: number = 20
): number {
  // More similar cars = higher score (up to a point)
  const ratio = Math.min(similarCarsInArea / maxSimilar, 1);
  return 0.5 + 0.5 * ratio;
}

/**
 * Calculate final composite score
 */
export function calculateFinalScore(
  semanticScore: number,
  constraintScore: number,
  personalScore: number,
  inventoryScore: number
): number {
  return (
    0.45 * semanticScore +
    0.25 * constraintScore +
    0.20 * personalScore +
    0.10 * inventoryScore
  );
}

