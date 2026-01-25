import { describe, it, expect } from 'vitest';
import { applyRelaxation } from '../app/lib/recommend/relaxation';
import { calculateConstraintScore } from '../app/lib/recommend/scoring';
import type { SearchFilters, Car } from '../app/lib/recommend/types';

describe('Hard Constraints', () => {
  it('should never violate hard price constraint', () => {
    const filters: SearchFilters = {
      budgetMax: 2500000,
      hardConstraints: ['price'],
    };
    
    const result = applyRelaxation(filters, 2);
    expect(result.filters.budgetMax).toBe(2500000);
    expect(result.relaxations.length).toBe(0);
  });

  it('should never violate hard fuel type constraint', () => {
    const filters: SearchFilters = {
      fuelType: ['electric'],
      hardConstraints: ['fuel_type'],
    };
    
    const car: Car = {
      id: '1',
      make: 'Toyota',
      model: 'RAV4',
      year: 2020,
      body_type: 'suv',
      price_cents: 2500000,
      mileage: 30000,
      fuel_type: 'gas', // Wrong fuel type
      city: 'Dallas',
      state: 'TX',
      is_available: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const score = calculateConstraintScore(car, filters);
    expect(score).toBe(0); // Should fail hard constraint
  });

  it('should allow relaxation of non-hard constraints', () => {
    const filters: SearchFilters = {
      budgetMax: 2500000,
      radiusMiles: 15,
      hardConstraints: ['price'], // Only price is hard
    };
    
    const result = applyRelaxation(filters, 1); // Relax radius
    expect(result.filters.radiusMiles).toBeGreaterThan(15);
    expect(result.filters.budgetMax).toBe(2500000); // Price unchanged
  });
});

