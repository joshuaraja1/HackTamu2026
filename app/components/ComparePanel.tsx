'use client';

import Link from 'next/link';
import { useCompare } from '../context/CompareContext';

export default function ComparePanel() {
  const { compareCars, removeFromCompare, clearCompare } = useCompare();

  if (compareCars.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Compare Cars ({compareCars.length}/4)
            </h3>
            {compareCars.length >= 2 && (
              <Link
                href="/compare"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                View Comparison
              </Link>
            )}
          </div>
          <button
            onClick={clearCompare}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Clear All
          </button>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-2">
          {compareCars.map((car) => (
            <div
              key={car.id}
              className="flex-shrink-0 w-48 bg-gray-50 rounded-lg border border-gray-200 p-3 relative"
            >
              <button
                onClick={() => removeFromCompare(car.id)}
                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
                aria-label="Remove from compare"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="h-24 bg-gradient-to-br from-blue-400 to-indigo-500 rounded mb-2 flex items-center justify-center">
                <span className="text-3xl opacity-50">🚗</span>
              </div>
              
              <h4 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-1">
                {car.year} {car.make} {car.model}
              </h4>
              <p className="text-xs text-gray-600 mb-1">
                ${(car.price_cents / 100).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                {car.mileage.toLocaleString()} mi
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

