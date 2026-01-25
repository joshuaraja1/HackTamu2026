import type { SearchFilters, Relaxation } from './types';

export interface RelaxationState {
  filters: SearchFilters;
  relaxations: Relaxation[];
  stage: number;
}

/**
 * Progressive constraint relaxation stages
 */
export function relaxConstraints(
  currentFilters: SearchFilters,
  stage: number
): { filters: SearchFilters; relaxations: Relaxation[] } {
  const newFilters = { ...currentFilters };
  const relaxations: Relaxation[] = [];

  switch (stage) {
    case 1: // Expand radius
      if (newFilters.radiusMiles) {
        const oldRadius = newFilters.radiusMiles;
        if (oldRadius < 25) {
          newFilters.radiusMiles = 25;
          relaxations.push({
            constraint: 'radius',
            from: `${oldRadius} miles`,
            to: '25 miles',
            rationale: 'Expanded search radius to find more options',
          });
        } else if (oldRadius < 50) {
          newFilters.radiusMiles = 50;
          relaxations.push({
            constraint: 'radius',
            from: `${oldRadius} miles`,
            to: '50 miles',
            rationale: 'Expanded search radius to find more options',
          });
        } else if (oldRadius < 100) {
          newFilters.radiusMiles = 100;
          relaxations.push({
            constraint: 'radius',
            from: `${oldRadius} miles`,
            to: '100 miles',
            rationale: 'Expanded search radius to find more options',
          });
        }
      }
      break;

    case 2: // Widen price max
      if (newFilters.budgetMax) {
        const oldMax = newFilters.budgetMax;
        const increase = Math.floor(oldMax * 0.1);
        newFilters.budgetMax = oldMax + increase;
        relaxations.push({
          constraint: 'max_price',
          from: `$${(oldMax / 100).toFixed(0)}`,
          to: `$${(newFilters.budgetMax / 100).toFixed(0)}`,
          rationale: 'Increased maximum price by 10% to show more options',
        });
      }
      break;

    case 3: // Widen price max more
      if (newFilters.budgetMax) {
        const oldMax = newFilters.budgetMax;
        const increase = Math.floor(oldMax * 0.2);
        newFilters.budgetMax = oldMax + increase;
        relaxations.push({
          constraint: 'max_price',
          from: `$${(oldMax / 100).toFixed(0)}`,
          to: `$${(newFilters.budgetMax / 100).toFixed(0)}`,
          rationale: 'Increased maximum price by 20% to show more options',
        });
      }
      break;

    case 4: // Widen year range
      if (newFilters.yearMin) {
        newFilters.yearMin = newFilters.yearMin - 1;
        relaxations.push({
          constraint: 'year_min',
          from: newFilters.yearMin + 1,
          to: newFilters.yearMin,
          rationale: 'Expanded minimum year range to include older models',
        });
      }
      if (newFilters.yearMax) {
        newFilters.yearMax = newFilters.yearMax + 1;
        relaxations.push({
          constraint: 'year_max',
          from: newFilters.yearMax - 1,
          to: newFilters.yearMax,
          rationale: 'Expanded maximum year range to include newer models',
        });
      }
      break;

    case 5: // Widen mileage
      if (newFilters.mileageMax) {
        const oldMax = newFilters.mileageMax;
        const increase = Math.floor(oldMax * 0.15);
        newFilters.mileageMax = oldMax + increase;
        relaxations.push({
          constraint: 'max_mileage',
          from: `${oldMax.toLocaleString()} miles`,
          to: `${newFilters.mileageMax.toLocaleString()} miles`,
          rationale: 'Increased maximum mileage by 15% to show more options',
        });
      }
      break;

    case 6: // Widen mileage more
      if (newFilters.mileageMax) {
        const oldMax = newFilters.mileageMax;
        const increase = Math.floor(oldMax * 0.3);
        newFilters.mileageMax = oldMax + increase;
        relaxations.push({
          constraint: 'max_mileage',
          from: `${oldMax.toLocaleString()} miles`,
          to: `${newFilters.mileageMax.toLocaleString()} miles`,
          rationale: 'Increased maximum mileage by 30% to show more options',
        });
      }
      break;
  }

  return { filters: newFilters, relaxations };
}

/**
 * Check if a constraint is hard (cannot be relaxed)
 */
export function isHardConstraint(constraint: string, hardConstraints?: string[]): boolean {
  if (!hardConstraints) return false;
  return hardConstraints.includes(constraint);
}

/**
 * Apply relaxation while respecting hard constraints
 */
export function applyRelaxation(
  currentFilters: SearchFilters,
  stage: number
): { filters: SearchFilters; relaxations: Relaxation[] } {
  const hardConstraints = currentFilters.hardConstraints || [];
  
  // Never relax hard constraints
  if (stage === 2 || stage === 3) {
    if (isHardConstraint('price', hardConstraints)) {
      return { filters: currentFilters, relaxations: [] };
    }
  }
  
  if (stage === 1) {
    if (isHardConstraint('radius', hardConstraints)) {
      return { filters: currentFilters, relaxations: [] };
    }
  }
  
  if (stage === 4) {
    if (isHardConstraint('year', hardConstraints)) {
      return { filters: currentFilters, relaxations: [] };
    }
  }
  
  if (stage === 5 || stage === 6) {
    if (isHardConstraint('mileage', hardConstraints)) {
      return { filters: currentFilters, relaxations: [] };
    }
  }

  return relaxConstraints(currentFilters, stage);
}

