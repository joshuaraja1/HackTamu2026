'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';
import Filters from '../Filters';
import type { SearchFilters } from '@/app/lib/recommend/types';

interface FilterDrawerProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  activeFilterCount: number;
}

export default function FilterDrawer({
  filters,
  onFiltersChange,
  activeFilterCount,
}: FilterDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 md:hidden">
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[90vw] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <Filters filters={filters} onFiltersChange={onFiltersChange} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

