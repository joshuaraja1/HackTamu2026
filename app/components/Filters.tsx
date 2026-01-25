'use client';

import { useState } from 'react';
import type { SearchFilters } from '@/app/lib/recommend/types';

interface FiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  userLocation?: { lat: number; lon: number };
}

export default function Filters({ filters, onFiltersChange, userLocation }: FiltersProps) {
  const [isOpen, setIsOpen] = useState(true);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: keyof SearchFilters, value: string) => {
    const current = (filters[key] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateFilter(key, updated);
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const activeFilterCount = [
    filters.budgetMin, filters.budgetMax, filters.yearMin, filters.yearMax,
    filters.mileageMax, filters.radiusMiles, filters.city, filters.make?.length, filters.bodyType?.length,
    filters.drivetrain?.length, filters.fuelType?.length, filters.seats, filters.features?.length
  ].filter(Boolean).length;

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden sticky top-20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center px-6 py-4 bg-muted/50 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-input rounded-lg hover:bg-muted transition-colors"
            >
              Clear All Filters
            </button>
          )}

          {/* Budget */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">💰 Budget</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.budgetMin ? filters.budgetMin / 100 : ''}
                  onChange={(e) =>
                    updateFilter('budgetMin', e.target.value ? parseInt(e.target.value) * 100 : undefined)
                  }
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.budgetMax ? filters.budgetMax / 100 : ''}
                  onChange={(e) =>
                    updateFilter('budgetMax', e.target.value ? parseInt(e.target.value) * 100 : undefined)
                  }
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">📅 Year</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.yearMin || ''}
                onChange={(e) =>
                  updateFilter('yearMin', e.target.value ? parseInt(e.target.value) : undefined)
                }
                className="flex-1 px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.yearMax || ''}
                onChange={(e) =>
                  updateFilter('yearMax', e.target.value ? parseInt(e.target.value) : undefined)
                }
                className="flex-1 px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          </div>

          {/* Mileage */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">🛣️ Max Mileage</label>
            <input
              type="number"
              placeholder="Miles"
              value={filters.mileageMax || ''}
              onChange={(e) =>
                updateFilter('mileageMax', e.target.value ? parseInt(e.target.value) : undefined)
              }
              className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">📍 Location</label>
            <input
              type="text"
              placeholder="City (e.g., Dallas, Austin, Houston)"
              value={filters.city || ''}
              maxLength={50}
              onChange={(e) => {
                const city = e.target.value;
                const cityLower = city.toLowerCase().trim();
                
                // City coordinates mapping
                const cityCoords: Record<string, { lat: number; lon: number }> = {
                  'dallas': { lat: 32.7767, lon: -96.7970 },
                  'austin': { lat: 30.2672, lon: -97.7431 },
                  'houston': { lat: 29.7604, lon: -95.3698 },
                  'los angeles': { lat: 34.0522, lon: -118.2437 },
                  'la': { lat: 34.0522, lon: -118.2437 },
                  'new york': { lat: 40.7128, lon: -74.0060 },
                  'nyc': { lat: 40.7128, lon: -74.0060 },
                  'chicago': { lat: 41.8781, lon: -87.6298 },
                };
                
                // Update all at once to avoid state batching issues
                const updatedFilters = {
                  ...filters,
                  city: city || undefined,
                  latitude: cityCoords[cityLower]?.lat || undefined,
                  longitude: cityCoords[cityLower]?.lon || undefined,
                };
                
                // Clear coordinates if city doesn't match
                if (!cityCoords[cityLower] && !city) {
                  updatedFilters.latitude = undefined;
                  updatedFilters.longitude = undefined;
                }
                
                onFiltersChange(updatedFilters);
              }}
              className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent mb-2"
            />
            <input
              type="number"
              placeholder="Radius (miles, e.g., 15)"
              value={filters.radiusMiles || ''}
              onChange={(e) =>
                updateFilter('radiusMiles', e.target.value ? parseInt(e.target.value) : undefined)
              }
              className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
            {filters.city && (
              <p className="text-xs text-muted-foreground mt-1">📍 Searching near {filters.city}</p>
            )}
          </div>

          {/* Make */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">🏭 Make</label>
            <div className="flex flex-wrap gap-2">
              {['Toyota', 'Honda', 'Ford', 'Tesla', 'BMW', 'Hyundai', 'Kia', 'Mazda'].map(make => (
                <button
                  key={make}
                  onClick={() => toggleArrayFilter('make', make)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filters.make?.includes(make)
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {make}
                </button>
              ))}
            </div>
          </div>

          {/* Body Type */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">🚙 Body Type</label>
            <div className="flex flex-wrap gap-2">
              {['sedan', 'suv', 'truck', 'coupe', 'hatchback', 'wagon'].map(type => (
                <button
                  key={type}
                  onClick={() => toggleArrayFilter('bodyType', type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                    filters.bodyType?.includes(type)
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Drivetrain */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">⚙️ Drivetrain</label>
            <div className="flex flex-wrap gap-2">
              {['fwd', 'rwd', 'awd', '4wd'].map(dt => (
                <button
                  key={dt}
                  onClick={() => toggleArrayFilter('drivetrain', dt.toLowerCase())}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium uppercase transition-all ${
                    filters.drivetrain?.includes(dt.toLowerCase())
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {dt}
                </button>
              ))}
            </div>
          </div>

          {/* Fuel Type */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">⛽ Fuel Type</label>
            <div className="flex flex-wrap gap-2">
              {['gas', 'hybrid', 'electric', 'diesel'].map(ft => (
                <button
                  key={ft}
                  onClick={() => toggleArrayFilter('fuelType', ft)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                    filters.fuelType?.includes(ft)
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>

          {/* Seats */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">💺 Min Seats</label>
            <input
              type="number"
              min="2"
              max="8"
              value={filters.seats || ''}
              onChange={(e) =>
                updateFilter('seats', e.target.value ? parseInt(e.target.value) : undefined)
              }
              className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">✨ Features</label>
            <div className="flex flex-wrap gap-2">
              {['CarPlay', 'heated_seats', 'lane_assist', 'adaptive_cruise', 'sunroof', 'third_row'].map(feature => (
                <button
                  key={feature}
                  onClick={() => toggleArrayFilter('features', feature)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filters.features?.includes(feature)
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {feature.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
