'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, MapPin } from 'lucide-react';
import type { RecommendationResult } from '@/app/lib/recommend/types';
import { useToast } from '@/hooks/use-toast';
import { getCarImageUrl, getFallbackCarImageUrl } from '@/app/lib/utils/carImages';

interface VehicleCardProps {
  result: RecommendationResult;
  onFavorite?: (carId: string) => void;
  isFavorited?: boolean;
}

export default function VehicleCard({ result, onFavorite, isFavorited = false }: VehicleCardProps) {
  const { car, score, reasons } = result;
  const { toast } = useToast();
  const price = (car.price_cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onFavorite) {
      onFavorite(car.id);
      toast({
        title: isFavorited ? 'Removed from favorites' : 'Added to favorites',
        description: isFavorited 
          ? 'Car removed from your favorites' 
          : 'Car added to favorites and comparison',
      });
    }
  };

  const imageUrl = getCarImageUrl({
    make: car.make,
    model: car.model,
    year: car.year,
    body_type: car.body_type,
  });

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-border">
      {/* Image Section - 16:9 aspect ratio */}
      <div className="relative aspect-video bg-gradient-to-br from-primary/20 via-primary/10 to-muted overflow-hidden">
        <img
          src={imageUrl}
          alt={`${car.year} ${car.make} ${car.model}`}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            const target = e.target as HTMLImageElement;
            if (target.src !== getFallbackCarImageUrl()) {
              target.src = getFallbackCarImageUrl();
            } else {
              // If fallback also fails, hide image and show placeholder
              target.style.display = 'none';
            }
          }}
          loading="lazy"
        />
        
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Price Badge */}
        <div className="absolute bottom-3 left-3 z-10">
          <Badge className="bg-background/90 backdrop-blur-sm text-foreground font-semibold text-base px-3 py-1.5 shadow-lg">
            {price}
          </Badge>
        </div>

        {/* Favorite Button */}
        {onFavorite && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 z-10 bg-background/90 backdrop-blur-sm hover:bg-background h-9 w-9 shadow-lg"
            onClick={handleFavoriteClick}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className={`h-5 w-5 ${
                isFavorited ? 'fill-destructive text-destructive' : 'text-muted-foreground'
              }`}
            />
          </Button>
        )}
      </div>

      <CardContent className="p-5">
        {/* Title */}
        <Link href={`/car/${car.id}`}>
          <h3 className="text-xl font-semibold mb-1 hover:text-primary transition-colors line-clamp-1">
            {car.year} {car.make} {car.model}
            {car.trim && <span className="text-muted-foreground font-normal"> {car.trim}</span>}
          </h3>
        </Link>
        
        <p className="text-sm text-muted-foreground mb-4 capitalize">
          {car.body_type} • {car.mileage.toLocaleString()} miles
        </p>

        {/* Specs Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {car.drivetrain && (
            <Badge variant="secondary" className="text-xs">
              {car.drivetrain.toUpperCase()}
            </Badge>
          )}
          {car.fuel_type && (
            <Badge variant="secondary" className="text-xs capitalize">
              {car.fuel_type}
            </Badge>
          )}
          {car.seats && (
            <Badge variant="secondary" className="text-xs">
              {car.seats} seats
            </Badge>
          )}
          {car.mpg_highway && (
            <Badge variant="secondary" className="text-xs">
              {car.mpg_highway} mpg
            </Badge>
          )}
        </div>

        {/* Features */}
        {car.features && car.features.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1.5">
              {car.features.slice(0, 3).map((feature, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {feature.replace('_', ' ')}
                </Badge>
              ))}
              {car.features.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{car.features.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Location */}
        <div className="flex items-center text-sm text-muted-foreground mb-4">
          <MapPin className="w-4 h-4 mr-1" />
          {car.city}, {car.state}
        </div>

        {/* Reasons */}
        {reasons && reasons.length > 0 && (
          <div className="mb-4 pt-4 border-t">
            <div className="text-xs">
              <div className="flex items-center gap-1 text-muted-foreground mb-2">
                <span className="font-semibold">Why you're seeing this:</span>
              </div>
              <ul className="space-y-1 text-muted-foreground">
                {reasons.slice(0, 2).map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span>
                    <span className="line-clamp-1">{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* CTA Button */}
        <Link href={`/car/${car.id}`} className="block">
          <Button className="w-full" size="lg">
            View Details
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

