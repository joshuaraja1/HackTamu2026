import { describe, it, expect } from 'vitest';
import { calculatePersonalScore } from '../app/lib/recommend/scoring';
import type { Car, UserProfile } from '../app/lib/recommend/types';

const mockCar: Car = {
  id: '1',
  make: 'Toyota',
  model: 'RAV4',
  year: 2020,
  body_type: 'suv',
  price_cents: 2500000,
  mileage: 30000,
  city: 'Dallas',
  state: 'TX',
  is_available: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  features: ['CarPlay', 'heated_seats'],
};

const user1: UserProfile = {
  id: 'user-1',
  preferred_makes: ['Toyota', 'Honda'],
  preferred_body_types: ['suv'],
  preferred_features: ['CarPlay', 'heated_seats'],
};

const user2: UserProfile = {
  id: 'user-2',
  preferred_makes: ['BMW', 'Mercedes'],
  preferred_body_types: ['sedan'],
  preferred_features: ['sunroof'],
};

describe('Personalization', () => {
  it('should score higher for user with matching preferences', () => {
    const score1 = calculatePersonalScore(mockCar, user1);
    const score2 = calculatePersonalScore(mockCar, user2);
    
    expect(score1).toBeGreaterThan(score2);
  });

  it('should return neutral score when no user profile', () => {
    const score = calculatePersonalScore(mockCar);
    expect(score).toBe(0.5);
  });

  it('should boost score for preferred make', () => {
    const toyotaCar = { ...mockCar, make: 'Toyota' };
    const bmwCar = { ...mockCar, make: 'BMW' };
    
    const toyotaScore = calculatePersonalScore(toyotaCar, user1);
    const bmwScore = calculatePersonalScore(bmwCar, user1);
    
    expect(toyotaScore).toBeGreaterThan(bmwScore);
  });

  it('should boost score for preferred body type', () => {
    const suvCar = { ...mockCar, body_type: 'suv' };
    const sedanCar = { ...mockCar, body_type: 'sedan' };
    
    const suvScore = calculatePersonalScore(suvCar, user1);
    const sedanScore = calculatePersonalScore(sedanCar, user1);
    
    expect(suvScore).toBeGreaterThan(sedanScore);
  });
});

