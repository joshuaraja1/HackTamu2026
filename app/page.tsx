'use client';

import { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import Filters from './components/Filters';
import ResultsList from './components/ResultsList';
import ComparePanel from './components/ComparePanel';
import TestDriveChat from './components/TestDriveChat';
import type { SearchFilters, RecommendationResponse } from './lib/recommend/types';
import { parseSearchQuery } from './lib/recommend/queryParser';
import { useCompare } from './context/CompareContext';

export default function Home() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const [personalizationEnabled, setPersonalizationEnabled] = useState(true);
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [showChatbot, setShowChatbot] = useState(false);
  const { addToCompare } = useCompare();

  // Demo users dropdown
  const demoUsers = [
    { id: 'user-1', name: 'User 1 (SUV Lover)' },
    { id: 'user-2', name: 'User 2 (Sedan Fan)' },
    { id: 'user-3', name: 'User 3 (Budget Conscious)' },
  ];

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    setLoading(true);

    try {
      // Parse query to extract filters
      const parsedFilters = parseSearchQuery(searchQuery, {});
      
      // Merge parsed filters with existing filters (parsed filters take precedence for make/bodyType/price/radius/location)
      const mergedFilters: SearchFilters = {
        ...filters,
        // Override with parsed values if they exist
        make: parsedFilters.make || filters.make,
        bodyType: parsedFilters.bodyType || filters.bodyType,
        budgetMax: parsedFilters.budgetMax || filters.budgetMax,
        budgetMin: parsedFilters.budgetMin || filters.budgetMin,
        radiusMiles: parsedFilters.radiusMiles || filters.radiusMiles,
        latitude: parsedFilters.latitude || filters.latitude,
        longitude: parsedFilters.longitude || filters.longitude,
        city: parsedFilters.city || filters.city,
        drivetrain: parsedFilters.drivetrain || filters.drivetrain,
        fuelType: parsedFilters.fuelType || filters.fuelType,
        transmission: parsedFilters.transmission || filters.transmission,
        queryText: searchQuery,
      };

      console.log('Searching with filters:', mergedFilters);

      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: personalizationEnabled ? userId : undefined,
          queryText: searchQuery,
          filters: mergedFilters,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API error:', errorData);
        console.error('Response status:', response.status);
        console.error('Response statusText:', response.statusText);
        // Set empty results with error info
        setResults({
          results: [],
          relaxation_applied: [],
          alternatives: { comparables: [], nearby_deals: [], best_available: [] },
          debug: { 
            stage_counts: {}, 
            top_signals: [`Error: ${errorData.error || 'Unknown error'}`], 
            final_stage: `error_${response.status}` 
          },
        });
        return;
      }

      const data = await response.json();
      console.log('Search results:', data);
      
      // Always set results, even if empty
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
      // Set empty results instead of showing alert
      setResults({
        results: [],
        relaxation_applied: [],
        alternatives: { comparables: [], nearby_deals: [], best_available: [] },
        debug: { stage_counts: {}, top_signals: [], final_stage: 'error' },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async (carId: string) => {
    const isFavorited = favoritedIds.has(carId);
    const newFavorited = new Set(favoritedIds);
    
    if (isFavorited) {
      newFavorited.delete(carId);
    } else {
      newFavorited.add(carId);
      // When favoriting, also add to compare (works even without userId)
      const car = results?.results.find(r => r.car.id === carId)?.car;
      if (car) {
        const added = addToCompare(car);
        if (!added) {
          // Limit reached - could show a toast notification here
          console.log('Compare limit reached (4 cars max)');
        } else {
          console.log('Added to compare:', car.year, car.make, car.model);
        }
      }
    }
    
    setFavoritedIds(newFavorited);

    // Track interaction (only if userId is set)
    if (userId) {
      try {
        await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            carId,
            interactionType: isFavorited ? 'unfavorite' : 'favorite',
          }),
        });
      } catch (error) {
        console.error('Track error:', error);
      }
    }
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                🚗 Car Marketplace
              </h1>
              <p className="text-sm text-gray-500 mt-1">Find your perfect car with AI-powered recommendations</p>
            </div>
            
            {/* Demo controls - compact */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <label className="text-xs text-gray-600">Demo User:</label>
                <select
                  value={userId || ''}
                  onChange={(e) => setUserId(e.target.value || undefined)}
                  className="text-sm bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  {demoUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={personalizationEnabled}
                  onChange={(e) => setPersonalizationEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-700">Personalization</span>
              </label>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-7xl pb-32">
        {/* Search Section */}
        <div className="mb-6 animate-fadeIn">
          <SearchBar onSearch={handleSearch} initialQuery={query} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Filters sidebar */}
          <aside className="lg:col-span-3">
            <Filters
              filters={filters}
              onFiltersChange={setFilters}
            />
          </aside>

          {/* Results */}
          <div className="lg:col-span-9">
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-4 text-gray-600 font-medium">Searching for the perfect match...</p>
                <p className="mt-2 text-sm text-gray-500">This may take a moment</p>
              </div>
            ) : results ? (
              <ResultsList
                response={results}
                userId={userId}
                onFavorite={handleFavorite}
                favoritedIds={favoritedIds}
              />
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Start Your Search</h2>
                <p className="text-gray-600 mb-6">Enter a search query to find cars that match your needs</p>
                <div className="inline-flex flex-col gap-2 text-left bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700">Try searching for:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• "AWD family SUV under 25k within 15 miles"</li>
                    <li>• "reliable sedan with good gas mileage"</li>
                    <li>• "luxury car with heated seats"</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Compare Panel */}
      <ComparePanel />

      {/* Floating Test Drive Chatbot Button */}
      {!showChatbot && (
        <button
          onClick={() => setShowChatbot(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-40"
          aria-label="Book a test drive"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* Test Drive Chatbot */}
      {showChatbot && (
        <TestDriveChat
          onClose={() => setShowChatbot(false)}
        />
      )}
    </main>
  );
}
