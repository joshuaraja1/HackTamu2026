'use client';

import { useState, useEffect } from 'react';
import AppLayout from './components/layout/AppLayout';
import SearchBar from './components/ui/SearchBar';
import Filters from './components/Filters';
import FilterDrawer from './components/ui/FilterDrawer';
import FilterChips from './components/ui/FilterChips';
import SortDropdown, { type SortOption } from './components/ui/SortDropdown';
import VehicleGrid from './components/ui/VehicleGrid';
import EmptyState from './components/ui/EmptyState';
import ErrorState from './components/ui/ErrorState';
import ComparePanel from './components/ComparePanel';
import TestDriveChat from './components/TestDriveChat';
import type { SearchFilters, RecommendationResponse, RecommendationResult } from './lib/recommend/types';
import { parseSearchQuery } from './lib/recommend/queryParser';
import { useCompare } from './context/CompareContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Home() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | undefined>();
  const [personalizationEnabled, setPersonalizationEnabled] = useState(true);
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [showChatbot, setShowChatbot] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
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
    setError(null);

    try {
      // Parse query to extract filters
      const parsedFilters = parseSearchQuery(searchQuery, {});
      
      // Merge parsed filters with existing filters
      const mergedFilters: SearchFilters = {
        ...filters,
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
        setError(errorData.error || 'Failed to fetch results');
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
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setError('An unexpected error occurred');
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
      // When favoriting, also add to compare
      const car = results?.results.find(r => r.car.id === carId)?.car;
      if (car) {
        addToCompare(car);
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

  const handleRemoveFilter = (key: keyof SearchFilters, value?: any) => {
    if (value !== undefined) {
      setFilters({ ...filters, [key]: value });
    } else {
      const { [key]: _, ...rest } = filters;
      setFilters(rest);
    }
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const activeFilterCount = [
    filters.budgetMin, filters.budgetMax, filters.yearMin, filters.yearMax,
    filters.mileageMax, filters.radiusMiles, filters.city, filters.make?.length, filters.bodyType?.length,
    filters.drivetrain?.length, filters.fuelType?.length, filters.seats, filters.features?.length
  ].filter(Boolean).length;

  // Sort results
  const sortedResults = results?.results ? [...results.results] : [];
  if (sortBy !== 'relevance' && sortedResults.length > 0) {
    sortedResults.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.car.price_cents - b.car.price_cents;
        case 'price-high':
          return b.car.price_cents - a.car.price_cents;
        case 'mileage-low':
          return a.car.mileage - b.car.mileage;
        case 'mileage-high':
          return b.car.mileage - a.car.mileage;
        case 'newest':
          return (b.car.year || 0) - (a.car.year || 0);
        default:
          return 0;
      }
    });
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 md:px-8 py-6 max-w-7xl pb-32">
        {/* Search Section */}
        <div className="mb-6">
          <SearchBar onSearch={handleSearch} initialQuery={query} />
        </div>

        {/* Demo Controls - Desktop */}
        <div className="hidden md:flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FilterDrawer
              filters={filters}
              onFiltersChange={setFilters}
              activeFilterCount={activeFilterCount}
            />
            {results && results.results.length > 0 && (
              <SortDropdown value={sortBy} onValueChange={setSortBy} />
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Demo User:</label>
              <select
                value={userId || ''}
                onChange={(e) => setUserId(e.target.value || undefined)}
                className="text-sm border border-input bg-background rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">None</option>
                {demoUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={personalizationEnabled}
                onChange={(e) => setPersonalizationEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
              <span className="text-muted-foreground">Personalization</span>
            </label>
          </div>
        </div>

        {/* Mobile Controls */}
        <div className="md:hidden flex items-center justify-between mb-4 gap-2">
          <FilterDrawer
            filters={filters}
            onFiltersChange={setFilters}
            activeFilterCount={activeFilterCount}
          />
          {results && results.results.length > 0 && (
            <SortDropdown value={sortBy} onValueChange={setSortBy} />
          )}
        </div>

        {/* Filter Chips */}
        {activeFilterCount > 0 && (
          <FilterChips
            filters={filters}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={handleClearFilters}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Filters sidebar - Desktop */}
          <aside className="hidden lg:block lg:col-span-3">
            <Filters filters={filters} onFiltersChange={setFilters} />
          </aside>

          {/* Results */}
          <div className="lg:col-span-9">
            {loading ? (
              <VehicleGrid loading={true} />
            ) : error ? (
              <ErrorState title="Search Error" message={error} onRetry={() => handleSearch(query)} />
            ) : results ? (
              results.results.length > 0 ? (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Found {results.results.length} {results.results.length === 1 ? 'car' : 'cars'}
                    </p>
                  </div>
                  <VehicleGrid
                    results={sortedResults}
                    onFavorite={handleFavorite}
                    favoritedIds={favoritedIds}
                  />
                </>
              ) : (
                <EmptyState
                  title="No cars found"
                  description="Try adjusting your search or filters to find more results."
                  action={
                    <Button variant="outline" onClick={handleClearFilters}>
                      Clear Filters
                    </Button>
                  }
                />
              )
            ) : (
              <EmptyState
                title="Start Your Search"
                description="Enter a search query to find cars that match your needs"
                action={
                  <div className="mt-4 text-left bg-muted rounded-lg p-4 max-w-md">
                    <p className="text-sm font-medium mb-2">Try searching for:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• "AWD family SUV under 25k within 15 miles"</li>
                      <li>• "reliable sedan with good gas mileage"</li>
                      <li>• "luxury car with heated seats"</li>
                    </ul>
                  </div>
                }
              />
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
          className="fixed bottom-6 right-6 w-16 h-16 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-40"
          aria-label="Book a test drive"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* Test Drive Chatbot */}
      {showChatbot && (
        <TestDriveChat onClose={() => setShowChatbot(false)} />
      )}
    </AppLayout>
  );
}
