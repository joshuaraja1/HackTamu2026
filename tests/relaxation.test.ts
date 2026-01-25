import { describe, it, expect } from 'vitest';
import { applyRelaxation } from '../app/lib/recommend/relaxation';
import type { SearchFilters } from '../app/lib/recommend/types';

describe('Constraint Relaxation', () => {
  it('should relax radius in correct order', () => {
    const filters: SearchFilters = { radiusMiles: 15 };
    
    const stage1 = applyRelaxation(filters, 1);
    expect(stage1.relaxations.length).toBeGreaterThan(0);
    expect(stage1.filters.radiusMiles).toBeGreaterThan(15);
    
    const stage2 = applyRelaxation(stage1.filters, 1);
    expect(stage2.filters.radiusMiles).toBeGreaterThan(stage1.filters.radiusMiles!);
  });

  it('should relax price max progressively', () => {
    const filters: SearchFilters = { budgetMax: 2500000 }; // $25k
    
    const stage2 = applyRelaxation(filters, 2);
    expect(stage2.relaxations.length).toBeGreaterThan(0);
    expect(stage2.filters.budgetMax).toBeGreaterThan(2500000);
    
    const stage3 = applyRelaxation(stage2.filters, 3);
    expect(stage3.filters.budgetMax).toBeGreaterThan(stage2.filters.budgetMax!);
  });

  it('should not relax hard constraints', () => {
    const filters: SearchFilters = {
      budgetMax: 2500000,
      hardConstraints: ['price'],
    };
    
    const result = applyRelaxation(filters, 2);
    expect(result.relaxations.length).toBe(0);
    expect(result.filters.budgetMax).toBe(2500000);
  });

  it('should relax year range', () => {
    const filters: SearchFilters = { yearMin: 2020, yearMax: 2023 };
    
    const result = applyRelaxation(filters, 4);
    expect(result.relaxations.length).toBeGreaterThan(0);
    expect(result.filters.yearMin).toBeLessThan(2020);
    expect(result.filters.yearMax).toBeGreaterThan(2023);
  });
});

