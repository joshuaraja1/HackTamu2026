'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { Car } from '@/app/lib/recommend/types';

interface CompareContextType {
  compareCars: Car[];
  addToCompare: (car: Car) => boolean; // Returns true if added, false if limit reached
  removeFromCompare: (carId: string) => void;
  clearCompare: () => void;
  isInCompare: (carId: string) => boolean;
  canAddMore: boolean;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

const MAX_COMPARE_CARS = 4;

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareCars, setCompareCars] = useState<Car[]>([]);

  const addToCompare = (car: Car): boolean => {
    // Check if already in compare
    if (compareCars.some(c => c.id === car.id)) {
      return true; // Already added
    }

    // Check if limit reached
    if (compareCars.length >= MAX_COMPARE_CARS) {
      return false; // Limit reached
    }

    setCompareCars(prev => [...prev, car]);
    return true;
  };

  const removeFromCompare = (carId: string) => {
    setCompareCars(prev => prev.filter(c => c.id !== carId));
  };

  const clearCompare = () => {
    setCompareCars([]);
  };

  const isInCompare = (carId: string): boolean => {
    return compareCars.some(c => c.id === carId);
  };

  const canAddMore = compareCars.length < MAX_COMPARE_CARS;

  return (
    <CompareContext.Provider
      value={{
        compareCars,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
        canAddMore,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (context === undefined) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
}

