'use client';

import { Skeleton } from '@/components/ui/skeleton';
import VehicleCard from './VehicleCard';
import type { RecommendationResult } from '@/app/lib/recommend/types';

interface VehicleGridProps {
  results: RecommendationResult[];
  loading?: boolean;
  onFavorite?: (carId: string) => void;
  favoritedIds?: Set<string>;
}

export function VehicleCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <div className="p-5 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export default function VehicleGrid({
  results,
  loading = false,
  onFavorite,
  favoritedIds = new Set(),
}: VehicleGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <VehicleCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {results.map((result) => (
        <VehicleCard
          key={result.car.id}
          result={result}
          onFavorite={onFavorite}
          isFavorited={favoritedIds.has(result.car.id)}
        />
      ))}
    </div>
  );
}

