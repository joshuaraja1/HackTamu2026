import { describe, it, expect } from 'vitest';
import { findComparables, findNearbyDeals } from '../app/lib/recommend/comparables';
import type { Car } from '../app/lib/recommend/types';

const mockCar: Car = {
  id: '1',
  make: 'Toyota',
  model: 'RAV4',
  year: 2020,
  body_type: 'suv',
  price_cents: 2500000,
  mileage: 30000,
  drivetrain: 'AWD',
  fuel_type: 'gas',
  seats: 5,
  mpg_highway: 30,
  city: 'Dallas',
  state: 'TX',
  is_available: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockCars: Car[] = [
  mockCar,
  {
    ...mockCar,
    id: '2',
    make: 'Honda',
    model: 'CR-V',
    price_cents: 2400000,
    seats: 5,
  },
  {
    ...mockCar,
    id: '3',
    make: 'Toyota',
    model: 'Highlander',
    price_cents: 3500000,
    seats: 7,
  },
  {
    ...mockCar,
    id: '4',
    make: 'Ford',
    model: 'Explorer',
    price_cents: 2800000,
    seats: 7,
  },
];

describe('Zero Match Fallbacks', () => {
  it('should find comparables based on similar attributes', () => {
    const comparables = findComparables(mockCar, mockCars, 10);
    
    expect(comparables.length).toBeGreaterThan(0);
    expect(comparables[0].similarity_reason).toBeTruthy();
    
    // Should find similar body type, seats, price
    const hondaMatch = comparables.find(c => c.car.make === 'Honda');
    expect(hondaMatch).toBeDefined();
  });

  it('should return nearby deals', () => {
    const deals = findNearbyDeals(mockCars, 32.7767, -96.7970, 50, 10);
    
    expect(deals.length).toBeGreaterThan(0);
    expect(deals[0].reason).toBeTruthy();
  });

  it('should handle empty car list gracefully', () => {
    const comparables = findComparables(mockCar, [], 10);
    expect(comparables.length).toBe(0);
    
    const deals = findNearbyDeals([], 32.7767, -96.7970, 50, 10);
    expect(deals.length).toBe(0);
  });
});

