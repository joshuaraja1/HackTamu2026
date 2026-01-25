'use client';

import CarCard from './CarCard';
import ExplainPanel from './ExplainPanel';
import type { RecommendationResponse } from '@/app/lib/recommend/types';

interface ResultsListProps {
  response: RecommendationResponse;
  userId?: string;
  onFavorite?: (carId: string) => void;
  favoritedIds?: Set<string>;
}

export default function ResultsList({
  response,
  userId,
  onFavorite,
  favoritedIds = new Set(),
}: ResultsListProps) {
  const { results, relaxation_applied, alternatives, debug } = response;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Relaxation notices */}
      {relaxation_applied && relaxation_applied.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-400 rounded-lg p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-2">
                We expanded your search to find more options
              </h3>
              <ul className="space-y-1.5 text-sm text-amber-800">
                {relaxation_applied.map((relax, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">→</span>
                    <span>
                      <strong className="font-semibold">{relax.constraint}:</strong> {relax.rationale} 
                      <span className="text-amber-700"> ({relax.from} → {relax.to})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main results */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Results
          </h2>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
            {results.length} {results.length === 1 ? 'car' : 'cars'} found
          </span>
        </div>
        
        {results.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="text-6xl mb-4">🚫</div>
            <p className="text-lg font-semibold text-gray-800 mb-2">No cars found</p>
            <p className="text-gray-600 mb-6">Try adjusting your filters or search terms</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {results.map((result, idx) => (
              <div key={result.car.id} style={{ animationDelay: `${idx * 50}ms` }} className="animate-fadeIn">
                <CarCard
                  result={result}
                  onFavorite={onFavorite}
                  isFavorited={favoritedIds.has(result.car.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alternatives */}
      {(alternatives.comparables.length > 0 ||
        alternatives.nearby_deals.length > 0 ||
        alternatives.best_available.length > 0) && (
        <div className="space-y-6 pt-6 border-t border-gray-200">
          {alternatives.comparables.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-900">Similar Options</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {alternatives.comparables.map((item) => (
                  <CarCard
                    key={item.car.id}
                    result={{
                      car: item.car,
                      score: 0,
                      reasons: [item.similarity_reason],
                    }}
                    onFavorite={onFavorite}
                    isFavorited={favoritedIds.has(item.car.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {alternatives.nearby_deals.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-900">Nearby Deals</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {alternatives.nearby_deals.map((item) => (
                  <CarCard
                    key={item.car.id}
                    result={{
                      car: item.car,
                      score: 0,
                      reasons: [item.reason],
                    }}
                    onFavorite={onFavorite}
                    isFavorited={favoritedIds.has(item.car.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {alternatives.best_available.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-900">Best Available</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {alternatives.best_available.map((item) => (
                  <CarCard
                    key={item.car.id}
                    result={{
                      car: item.car,
                      score: 0,
                      reasons: [item.reason],
                    }}
                    onFavorite={onFavorite}
                    isFavorited={favoritedIds.has(item.car.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Debug panel (dev only) */}
      {debug && process.env.NODE_ENV === 'development' && (
        <ExplainPanel debug={debug} />
      )}
    </div>
  );
}
