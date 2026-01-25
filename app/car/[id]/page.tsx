'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/app/components/layout/AppLayout';
import { supabaseClient } from '@/app/lib/supabaseClient';
import type { Car } from '@/app/lib/recommend/types';
import TestDriveChat from '@/app/components/TestDriveChat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Calendar, Fuel, Gauge, Users, Settings } from 'lucide-react';
import { getCarImageUrl, getFallbackCarImageUrl } from '@/app/lib/utils/carImages';

export default function CarDetailPage() {
  const params = useParams();
  const router = useRouter();
  const carId = params.id as string;
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | undefined>();
  const [showChatbot, setShowChatbot] = useState(false);

  useEffect(() => {
    if (!supabaseClient) {
      console.error('Supabase client not initialized');
      setLoading(false);
      return;
    }

    // Get current user
    supabaseClient.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
      }
    });

    // Fetch car details
    supabaseClient
      .from('listings')
      .select(`
        listing_id,
        vehicle_id,
        price,
        mileage,
        lat,
        lon,
        features,
        is_available,
        created_at,
        vehicles_master (
          id,
          make,
          model,
          base_model,
          year,
          drive,
          transmission,
          fuel_type,
          mpg_city,
          mpg_hwy,
          size_class,
          cylinders,
          engine_displacement
        )
      `)
      .eq('listing_id', carId)
      .eq('is_available', true)
      .single()
      .then(({ data: listingData, error: listingError }) => {
        if (listingError || !listingData) {
          console.error('Error fetching listing:', listingError);
          setLoading(false);
          return;
        }

        const listing = listingData as any;
        const vehicle = listing.vehicles_master;

        if (!vehicle) {
          console.error('Vehicle data not found');
          setLoading(false);
          return;
        }

        // Map size_class to body_type
        let bodyType = vehicle.size_class || 'sedan';
        const sizeClassLower = bodyType.toLowerCase();
        if (sizeClassLower.includes('sport utility') || sizeClassLower.includes('suv') || sizeClassLower.includes('utility')) {
          bodyType = 'suv';
        } else if (sizeClassLower.includes('pickup') || sizeClassLower.includes('pick-up')) {
          bodyType = 'truck';
        } else if (sizeClassLower.includes('two seater') || sizeClassLower.includes('two-seater')) {
          bodyType = 'coupe';
        } else if (sizeClassLower.includes('minivan') || sizeClassLower.includes('mini-van')) {
          bodyType = 'van';
        } else if (sizeClassLower.includes('wagon')) {
          bodyType = 'wagon';
        } else if (sizeClassLower.includes('hatchback')) {
          bodyType = 'hatchback';
        } else {
          bodyType = 'sedan';
        }

        // Map drive to drivetrain
        let drivetrain = vehicle.drive?.toLowerCase() || '';
        if (drivetrain.includes('4-wheel') || drivetrain.includes('all-wheel') || drivetrain.includes('4wd') || drivetrain.includes('awd')) {
          drivetrain = 'awd';
        } else if (drivetrain.includes('front') || drivetrain.includes('fwd')) {
          drivetrain = 'fwd';
        } else if (drivetrain.includes('rear') || drivetrain.includes('rwd')) {
          drivetrain = 'rwd';
        }

        // Derive city/state from coordinates
        const metros = [
          { name: 'Dallas', state: 'TX', lat: 32.7767, lon: -96.7970 },
          { name: 'Austin', state: 'TX', lat: 30.2672, lon: -97.7431 },
          { name: 'Houston', state: 'TX', lat: 29.7604, lon: -95.3698 },
          { name: 'Los Angeles', state: 'CA', lat: 34.0522, lon: -118.2437 },
          { name: 'New York', state: 'NY', lat: 40.7128, lon: -74.0060 },
          { name: 'Chicago', state: 'IL', lat: 41.8781, lon: -87.6298 },
        ];

        let city = 'Unknown';
        let state = 'TX';
        if (listing.lat && listing.lon) {
          let minDist = Infinity;
          for (const metro of metros) {
            const dist = Math.sqrt(
              Math.pow(listing.lat - metro.lat, 2) + Math.pow(listing.lon - metro.lon, 2)
            );
            if (dist < minDist) {
              minDist = dist;
              city = metro.name;
              state = metro.state;
            }
          }
        }

        // Convert features from JSONB array to string array
        const features = Array.isArray(listing.features)
          ? listing.features.map((f: any) => typeof f === 'string' ? f : String(f))
          : [];

        // Map to Car interface
        const car: Car = {
          id: listing.listing_id,
          make: vehicle.make,
          model: vehicle.model,
          trim: vehicle.base_model || undefined,
          year: vehicle.year,
          body_type: bodyType,
          price_cents: listing.price * 100,
          mileage: listing.mileage,
          drivetrain: drivetrain || undefined,
          fuel_type: vehicle.fuel_type?.toLowerCase() || undefined,
          transmission: vehicle.transmission?.toLowerCase() || undefined,
          mpg_city: vehicle.mpg_city ? Math.round(vehicle.mpg_city) : undefined,
          mpg_highway: vehicle.mpg_hwy ? Math.round(vehicle.mpg_hwy) : undefined,
          features: features.length > 0 ? features : undefined,
          city,
          state,
          latitude: listing.lat || undefined,
          longitude: listing.lon || undefined,
          is_available: listing.is_available,
          created_at: listing.created_at,
          updated_at: listing.created_at,
        };

        setCar(car);

        // Track view
        setTimeout(() => {
          if (userId) {
            fetch('/api/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                carId,
                interactionType: 'view',
              }),
            });
          }
        }, 100);

        setLoading(false);
      });
  }, [carId, userId]);

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 md:px-8 py-8 max-w-7xl">
          <Skeleton className="h-10 w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="aspect-video w-full rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!car) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 md:px-8 py-8 max-w-7xl">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-4">Car not found</h1>
            <Link href="/">
              <Button variant="outline">Back to search</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const price = (car.price_cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  return (
    <AppLayout>
      <div className="container mx-auto px-4 md:px-8 py-8 max-w-7xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            ← Back to search
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <Card>
              <div className="relative aspect-video bg-gradient-to-br from-primary/20 via-primary/10 to-muted rounded-t-lg overflow-hidden">
                <img
                  src={getCarImageUrl({
                    make: car.make,
                    model: car.model,
                    year: car.year,
                    body_type: car.body_type,
                  })}
                  alt={`${car.year} ${car.make} ${car.model}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== getFallbackCarImageUrl()) {
                      target.src = getFallbackCarImageUrl();
                    } else {
                      target.style.display = 'none';
                    }
                  }}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                {/* Fallback placeholder */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                  <div className="text-8xl">🚗</div>
                </div>
              </div>
            </Card>

            {/* Key Facts */}
            <Card>
              <CardHeader>
                <CardTitle>Key Facts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Year</p>
                      <p className="font-semibold">{car.year}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Gauge className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Mileage</p>
                      <p className="font-semibold">{car.mileage.toLocaleString()} mi</p>
                    </div>
                  </div>
                  {car.drivetrain && (
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Drivetrain</p>
                        <p className="font-semibold uppercase">{car.drivetrain}</p>
                      </div>
                    </div>
                  )}
                  {car.fuel_type && (
                    <div className="flex items-center gap-3">
                      <Fuel className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Fuel Type</p>
                        <p className="font-semibold capitalize">{car.fuel_type}</p>
                      </div>
                    </div>
                  )}
                  {car.transmission && (
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Transmission</p>
                        <p className="font-semibold capitalize">{car.transmission}</p>
                      </div>
                    </div>
                  )}
                  {car.mpg_city && car.mpg_highway && (
                    <div className="flex items-center gap-3">
                      <Fuel className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">MPG</p>
                        <p className="font-semibold">{car.mpg_city}/{car.mpg_highway}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            {car.features && car.features.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {car.features.map((feature, idx) => (
                      <Badge key={idx} variant="secondary">
                        {feature.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sticky Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <Card>
                <CardHeader>
                  <CardTitle className="text-3xl">{price}</CardTitle>
                  <p className="text-muted-foreground">
                    {car.year} {car.make} {car.model}
                    {car.trim && <span> {car.trim}</span>}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {car.city}, {car.state}
                  </div>
                  
                  <div className="pt-4 space-y-2">
                    <Button
                      onClick={() => setShowChatbot(true)}
                      className="w-full"
                      size="lg"
                    >
                      Book a Test Drive
                    </Button>
                    <Link href="/">
                      <Button variant="outline" className="w-full">
                        Continue Shopping
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Test Drive Chatbot */}
      {showChatbot && (
        <TestDriveChat
          carName={`${car.year} ${car.make} ${car.model}${car.trim ? ` ${car.trim}` : ''}`}
          onClose={() => setShowChatbot(false)}
        />
      )}
    </AppLayout>
  );
}
