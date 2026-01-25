import type { Car } from './types';

/**
 * Generate searchable text representation of a car for embedding
 */
export function generateCarSearchText(car: Car): string {
  const parts: string[] = [
    car.make,
    car.model,
    car.trim || '',
    car.year.toString(),
    car.body_type,
    car.drivetrain || '',
    car.fuel_type || '',
    car.transmission || '',
    car.engine || '',
    car.seats?.toString() || '',
    car.features?.join(' ') || '',
    car.city,
    car.state,
    car.description || '',
  ];

  return parts.filter(Boolean).join(' ').toLowerCase();
}

/**
 * Tokenize text for hashed embedding fallback
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
}

