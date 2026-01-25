/**
 * Calculate distance between two lat/lng points using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a car is within radius of a location
 */
export function isWithinRadius(
  carLat: number | null | undefined,
  carLon: number | null | undefined,
  userLat: number | null | undefined,
  userLon: number | null | undefined,
  radiusMiles: number
): boolean {
  if (!carLat || !carLon || !userLat || !userLon) return false;
  const distance = calculateDistance(userLat, userLon, carLat, carLon);
  return distance <= radiusMiles;
}

/**
 * Calculate distance score (closer = higher score, max 1.0)
 */
export function distanceScore(
  carLat: number | null | undefined,
  carLon: number | null | undefined,
  userLat: number | null | undefined,
  userLon: number | null | undefined,
  maxRadius: number
): number {
  if (!carLat || !carLon || !userLat || !userLon) return 0.5; // Neutral if no location
  
  const distance = calculateDistance(userLat, userLon, carLat, carLon);
  if (distance > maxRadius) return 0;
  
  // Score decreases linearly with distance
  return Math.max(0, 1 - (distance / maxRadius));
}

