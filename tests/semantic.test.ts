import { describe, it, expect } from 'vitest';
import { generateHashedEmbedding, cosineSimilarity } from '../app/lib/recommend/embeddings';
import { generateCarSearchText } from '../app/lib/recommend/text';
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
  city: 'Dallas',
  state: 'TX',
  is_available: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('Semantic Search', () => {
  it('should generate search text from car', () => {
    const text = generateCarSearchText(mockCar);
    expect(text).toContain('toyota');
    expect(text).toContain('rav4');
    expect(text).toContain('suv');
    expect(text).toContain('2020');
  });

  it('should generate hashed embedding', () => {
    const text = 'toyota rav4 suv awd';
    const embedding = generateHashedEmbedding(text);
    
    expect(embedding.length).toBe(384);
    expect(embedding.every(v => typeof v === 'number')).toBe(true);
  });

  it('should compute cosine similarity', () => {
    const vec1 = [1, 0, 0];
    const vec2 = [1, 0, 0];
    const vec3 = [0, 1, 0];
    
    expect(cosineSimilarity(vec1, vec2)).toBe(1);
    expect(cosineSimilarity(vec1, vec3)).toBe(0);
  });

  it('should return non-empty embeddings for different queries', () => {
    const query1 = 'family suv awd';
    const query2 = 'sports car manual';
    
    const emb1 = generateHashedEmbedding(query1);
    const emb2 = generateHashedEmbedding(query2);
    
    expect(emb1.length).toBe(384);
    expect(emb2.length).toBe(384);
    expect(cosineSimilarity(emb1, emb2)).toBeLessThan(1); // Should be different
  });
});

