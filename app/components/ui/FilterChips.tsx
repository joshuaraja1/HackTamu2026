'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { SearchFilters } from '@/app/lib/recommend/types';

interface FilterChipsProps {
  filters: SearchFilters;
  onRemoveFilter: (key: keyof SearchFilters, value?: any) => void;
  onClearAll: () => void;
}

export default function FilterChips({
  filters,
  onRemoveFilter,
  onClearAll,
}: FilterChipsProps) {
  const activeFilters: Array<{ key: keyof SearchFilters; label: string; value: any }> = [];

  // Build active filters array
  if (filters.make && filters.make.length > 0) {
    filters.make.forEach((make) => {
      activeFilters.push({ key: 'make', label: `Make: ${make}`, value: make });
    });
  }

  if (filters.bodyType && filters.bodyType.length > 0) {
    filters.bodyType.forEach((bodyType) => {
      activeFilters.push({ key: 'bodyType', label: `Type: ${bodyType}`, value: bodyType });
    });
  }

  if (filters.budgetMin) {
    activeFilters.push({
      key: 'budgetMin',
      label: `Min: $${(filters.budgetMin / 100).toLocaleString()}`,
      value: filters.budgetMin,
    });
  }

  if (filters.budgetMax) {
    activeFilters.push({
      key: 'budgetMax',
      label: `Max: $${(filters.budgetMax / 100).toLocaleString()}`,
      value: filters.budgetMax,
    });
  }

  if (filters.yearMin) {
    activeFilters.push({ key: 'yearMin', label: `Year: ${filters.yearMin}+`, value: filters.yearMin });
  }

  if (filters.yearMax) {
    activeFilters.push({ key: 'yearMax', label: `Year: ≤${filters.yearMax}`, value: filters.yearMax });
  }

  if (filters.city) {
    activeFilters.push({ key: 'city', label: `Location: ${filters.city}`, value: filters.city });
  }

  if (filters.radiusMiles) {
    activeFilters.push({
      key: 'radiusMiles',
      label: `Radius: ${filters.radiusMiles} mi`,
      value: filters.radiusMiles,
    });
  }

  if (filters.drivetrain && filters.drivetrain.length > 0) {
    filters.drivetrain.forEach((dt) => {
      activeFilters.push({
        key: 'drivetrain',
        label: `Drivetrain: ${dt.toUpperCase()}`,
        value: dt,
      });
    });
  }

  if (filters.fuelType && filters.fuelType.length > 0) {
    filters.fuelType.forEach((ft) => {
      activeFilters.push({
        key: 'fuelType',
        label: `Fuel: ${ft}`,
        value: ft,
      });
    });
  }

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
      {activeFilters.map((filter, idx) => (
        <Badge key={idx} variant="secondary" className="gap-1.5 pr-1.5">
          {filter.label}
          <button
            onClick={() => {
              if (Array.isArray(filters[filter.key])) {
                const current = filters[filter.key] as any[];
                const updated = current.filter((v) => v !== filter.value);
                onRemoveFilter(filter.key, updated.length > 0 ? updated : undefined);
              } else {
                onRemoveFilter(filter.key);
              }
            }}
            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
            aria-label={`Remove ${filter.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {activeFilters.length > 1 && (
        <Button variant="ghost" size="sm" onClick={onClearAll} className="h-7 text-xs">
          Clear all
        </Button>
      )}
    </div>
  );
}

