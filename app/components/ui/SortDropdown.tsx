'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown } from 'lucide-react';

export type SortOption = 'relevance' | 'price-low' | 'price-high' | 'mileage-low' | 'mileage-high' | 'newest';

interface SortDropdownProps {
  value: SortOption;
  onValueChange: (value: SortOption) => void;
}

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'mileage-low', label: 'Mileage: Low to High' },
  { value: 'mileage-high', label: 'Mileage: High to Low' },
  { value: 'newest', label: 'Newest First' },
];

export default function SortDropdown({ value, onValueChange }: SortDropdownProps) {
  const currentLabel = sortOptions.find((opt) => opt.value === value)?.label || 'Sort';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowUpDown className="h-4 w-4" />
          {currentLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onValueChange(option.value)}
            className={value === option.value ? 'bg-accent' : ''}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

