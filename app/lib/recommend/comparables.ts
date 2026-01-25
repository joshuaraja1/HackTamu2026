import type { Car } from './types';

/**
 * Find comparable cars based on similar attributes
 */
export function findComparables(
  targetCar: Car,
  allCars: Car[],
  maxResults: number = 10
): Array<{ car: Car; similarity_reason: string }> {
  const comparables: Array<{ car: Car; score: number; reasons: string[] }> = [];

  for (const car of allCars) {
    if (car.id === targetCar.id) continue;

    const reasons: string[] = [];
    let score = 0;

    // Body type match
    if (car.body_type === targetCar.body_type) {
      score += 3;
      reasons.push(`Same body type (${car.body_type})`);
    }

    // Seats match
    if (car.seats && targetCar.seats && Math.abs(car.seats - targetCar.seats) <= 1) {
      score += 2;
      reasons.push(`Similar seating (${car.seats} seats)`);
    }

    // Price band (within 20%)
    const priceDiff = Math.abs(car.price_cents - targetCar.price_cents) / targetCar.price_cents;
    if (priceDiff <= 0.2) {
      score += 2;
      reasons.push('Similar price range');
    }

    // MPG similarity
    if (car.mpg_highway && targetCar.mpg_highway) {
      const mpgDiff = Math.abs(car.mpg_highway - targetCar.mpg_highway) / targetCar.mpg_highway;
      if (mpgDiff <= 0.15) {
        score += 1;
        reasons.push('Similar fuel efficiency');
      }
    }

    // Drivetrain match
    if (car.drivetrain && targetCar.drivetrain && car.drivetrain === targetCar.drivetrain) {
      score += 1;
      reasons.push(`Same drivetrain (${car.drivetrain})`);
    }

    // Size class approximation (using seats + body type)
    if (car.seats && targetCar.seats) {
      const seatDiff = Math.abs(car.seats - targetCar.seats);
      if (seatDiff === 0) {
        score += 1;
      }
    }

    if (score > 0) {
      comparables.push({ car, score, reasons });
    }
  }

  // Sort by score and take top results
  comparables.sort((a, b) => b.score - a.score);
  
  return comparables.slice(0, maxResults).map(item => ({
    car: item.car,
    similarity_reason: item.reasons.join('; '),
  }));
}

/**
 * Find nearby deals (good value cars in area)
 */
export function findNearbyDeals(
  allCars: Car[],
  userLat?: number,
  userLon?: number,
  radiusMiles: number = 50,
  maxResults: number = 10
): Array<{ car: Car; reason: string }> {
  const deals: Array<{ car: Car; score: number; reason: string }> = [];

  for (const car of allCars) {
    if (!car.is_available) continue;

    let score = 0;
    const reasons: string[] = [];

    // Price per mile value (lower is better)
    if (car.mileage > 0) {
      const pricePerMile = car.price_cents / car.mileage;
      // Lower price per mile = better deal
      score += 1000 / (pricePerMile + 1);
      reasons.push('Good value (low price per mile)');
    }

    // Recent year
    const currentYear = new Date().getFullYear();
    const age = currentYear - car.year;
    if (age <= 3) {
      score += 2;
      reasons.push('Recent model year');
    }

    // Low mileage for age
    if (car.mileage > 0) {
      const avgMilesPerYear = car.mileage / Math.max(age, 1);
      if (avgMilesPerYear < 12000) {
        score += 2;
        reasons.push('Low mileage for age');
      }
    }

    // Location proximity
    if (userLat && userLon && car.latitude && car.longitude) {
      const distance = Math.sqrt(
        Math.pow(car.latitude - userLat, 2) + Math.pow(car.longitude - userLon, 2)
      ) * 69; // Rough miles conversion
      if (distance <= radiusMiles) {
        score += 1;
        reasons.push(`Within ${Math.round(distance)} miles`);
      }
    }

    if (score > 0) {
      deals.push({
        car,
        score,
        reason: reasons.join('; '),
      });
    }
  }

  deals.sort((a, b) => b.score - a.score);
  return deals.slice(0, maxResults).map(item => ({
    car: item.car,
    reason: item.reason,
  }));
}

