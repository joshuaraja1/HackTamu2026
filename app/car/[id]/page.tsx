'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseClient } from '@/app/lib/supabaseClient';
import type { Car } from '@/app/lib/recommend/types';

export default function CarDetailPage() {
  const params = useParams();
  const router = useRouter();
  const carId = params.id as string;
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | undefined>();

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

    // Fetch car details from listings and vehicles_master
    // First, get the listing
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
          price_cents: listing.price * 100, // Convert dollars to cents
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

        // Track view (use userId from state, will be set by auth call)
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

  const handlePurchase = async () => {
    if (!userId) {
      alert('Please log in to purchase');
      return;
    }

    try {
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          carId,
          interactionType: 'purchase',
        }),
      });
      alert('Purchase logged! (This is a demo)');
    } catch (error) {
      console.error('Purchase error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Car not found</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  const price = (car.price_cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to search
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-2">
            {car.year} {car.make} {car.model} {car.trim && car.trim}
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            {car.body_type} • {car.mileage.toLocaleString()} miles
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">{price}</h2>
              <div className="space-y-2">
                <div>
                  <strong>Location:</strong> {car.city}, {car.state}
                </div>
                {car.seller_name && (
                  <div>
                    <strong>Seller:</strong> {car.seller_name}
                  </div>
                )}
                {car.seller_phone && (
                  <div>
                    <strong>Phone:</strong> {car.seller_phone}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Specifications</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <strong>Year:</strong> {car.year}
                </div>
                <div>
                  <strong>Mileage:</strong> {car.mileage.toLocaleString()} miles
                </div>
                {car.drivetrain && (
                  <div>
                    <strong>Drivetrain:</strong> {car.drivetrain.toUpperCase()}
                  </div>
                )}
                {car.fuel_type && (
                  <div>
                    <strong>Fuel:</strong> {car.fuel_type}
                  </div>
                )}
                {car.transmission && (
                  <div>
                    <strong>Transmission:</strong> {car.transmission}
                  </div>
                )}
                {car.engine && (
                  <div>
                    <strong>Engine:</strong> {car.engine}
                  </div>
                )}
                {car.seats && (
                  <div>
                    <strong>Seats:</strong> {car.seats}
                  </div>
                )}
                {car.doors && (
                  <div>
                    <strong>Doors:</strong> {car.doors}
                  </div>
                )}
                {car.mpg_city && car.mpg_highway && (
                  <div>
                    <strong>MPG:</strong> {car.mpg_city} city / {car.mpg_highway} hwy
                  </div>
                )}
                {car.color && (
                  <div>
                    <strong>Color:</strong> {car.color}
                  </div>
                )}
                {car.vin && (
                  <div>
                    <strong>VIN:</strong> {car.vin}
                  </div>
                )}
              </div>
            </div>
          </div>

          {car.features && car.features.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Features</h3>
              <div className="flex flex-wrap gap-2">
                {car.features.map((feature, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded"
                  >
                    {feature.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {car.description && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-700">{car.description}</p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handlePurchase}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Purchase (Demo)
            </button>
            <Link
              href="/"
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

