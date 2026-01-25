import { supabaseAdmin } from '../supabaseServer';
import type {
  Car,
  UserProfile,
  SearchFilters,
  RecommendationResponse,
  RecommendationResult,
} from './types';
// Import cosineSimilarity from utils (no external deps)
import { cosineSimilarity } from './utils';
import { calculateDistance } from './geo';
import {
  calculateConstraintScore,
  calculatePersonalScore,
  calculateInventoryScore,
  calculateFinalScore,
} from './scoring';
import { applyRelaxation } from './relaxation';
import { findComparables, findNearbyDeals } from './comparables';

const TARGET_RESULTS = 100000; // Show all results
const MIN_RESULTS = 0; // No minimum required

/**
 * Get user profile and preference vector
 */
async function getUserProfile(userId?: string): Promise<{
  profile?: UserProfile;
  preferenceVector?: number[];
}> {
  if (!userId) return {};

  const { data: profile } = await supabaseAdmin
    .from('users_profile')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) return {};

  return {
    profile: profile as UserProfile,
    preferenceVector: profile.preference_vector || undefined,
  };
}

/**
 * Semantic search using pgvector
 */
async function semanticSearch(
  queryEmbedding: number[],
  filters: SearchFilters,
  limit: number = 100
): Promise<Car[]> {
  // Build base query
  let query = supabaseAdmin
    .from('cars')
    .select('*')
    .eq('is_available', true)
    .limit(limit);

  // Apply basic filters that don't need relaxation
  if (filters.make && filters.make.length > 0) {
    query = query.in('make', filters.make);
  }
  if (filters.bodyType && filters.bodyType.length > 0) {
    query = query.in('body_type', filters.bodyType);
  }
  if (filters.fuelType && filters.fuelType.length > 0) {
    query = query.in('fuel_type', filters.fuelType);
  }
  if (filters.drivetrain && filters.drivetrain.length > 0) {
    query = query.in('drivetrain', filters.drivetrain);
  }

  // Use pgvector similarity search
  // Convert embedding array to PostgreSQL vector format
  const embeddingStr = `[${queryEmbedding.join(',')}]`;
  
  try {
    const { data, error } = await supabaseAdmin.rpc('match_cars', {
      query_embedding: embeddingStr,
      match_threshold: 0.3,
      match_count: limit,
    });

    if (error) {
      console.error('Semantic search error:', error);
      // Fallback to regular query
      const { data: fallbackData } = await query;
      return (fallbackData as Car[]) || [];
    }

    return (data as Car[]) || [];
  } catch (error) {
    console.error('RPC call failed, using fallback:', error);
    // Fallback to regular query
    const { data: fallbackData } = await query;
    return (fallbackData as Car[]) || [];
  }
}

/**
 * Get cars with filters applied
 */
async function getCarsWithFilters(filters: SearchFilters, limit: number = 100000): Promise<Car[]> {
  console.log('[getCarsWithFilters] Applying filters:', {
    make: filters.make,
    model: filters.model,
    bodyType: filters.bodyType,
    yearMin: filters.yearMin,
    yearMax: filters.yearMax,
    budgetMin: filters.budgetMin,
    budgetMax: filters.budgetMax,
    drivetrain: filters.drivetrain,
    fuelType: filters.fuelType,
    transmission: filters.transmission,
    seats: filters.seats,
    features: filters.features,
    latitude: filters.latitude,
    longitude: filters.longitude,
    radiusMiles: filters.radiusMiles,
    city: filters.city,
  });

  // Quick test: verify database has data
  try {
    const { count: listingCount } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('is_available', true);
    console.log(`[getCarsWithFilters] Database check: ${listingCount} available listings in database`);
    
    if (listingCount === 0) {
      console.error('[getCarsWithFilters] WARNING: No listings in database! Run: pnpm run seed:all');
      return [];
    }
  } catch (error) {
    console.error('[getCarsWithFilters] Error checking database:', error);
  }

  // Safety check
  if (!supabaseAdmin) {
    console.error('[getCarsWithFilters] supabaseAdmin is not initialized');
    return [];
  }

  // Check if we have any vehicle-level filters
  let hasVehicleFilters = !!(filters.make?.length || filters.model?.length || filters.yearMin || filters.yearMax || filters.fuelType?.length || filters.transmission?.length);
  
  let vehicleIds: string[] = [];
  
  if (hasVehicleFilters) {
    try {
      if (!supabaseAdmin) {
        console.error('[getCarsWithFilters] supabaseAdmin is not initialized');
        return [];
      }
      // First, get vehicle IDs that match filters (from vehicles_master)
      let vehicleQuery = supabaseAdmin
        .from('vehicles_master')
        .select('id')
        .limit(100000); // Get all matching vehicles
      
      // Apply vehicle-level filters
      if (filters.make && filters.make.length > 0) {
        // Use case-insensitive matching - try exact match first, then ilike if needed
        // Test showed "Toyota" works with exact match, so try that first
        vehicleQuery = vehicleQuery.in('make', filters.make);
        console.log('[getCarsWithFilters] Filtering by make:', filters.make);
      }
      if (filters.model && filters.model.length > 0) {
        // Filter by model (case-insensitive) - use ilike for each model
        // Note: Supabase doesn't support complex OR with multiple columns easily, so we'll filter in memory
        console.log('[getCarsWithFilters] Will filter by model in memory:', filters.model);
        // We'll apply model filter later in memory after fetching
      }
      if (filters.yearMin) {
        vehicleQuery = vehicleQuery.gte('year', filters.yearMin);
      }
      if (filters.yearMax) {
        vehicleQuery = vehicleQuery.lte('year', filters.yearMax);
      }
      if (filters.fuelType && filters.fuelType.length > 0) {
        vehicleQuery = vehicleQuery.in('fuel_type', filters.fuelType);
      }
      if (filters.transmission && filters.transmission.length > 0) {
        // Filter by transmission (case-insensitive) - filter in memory
        console.log('[getCarsWithFilters] Will filter by transmission in memory:', filters.transmission);
        // We'll apply transmission filter later in memory after fetching
      }
      
      const { data: matchingVehicles, error: vehicleError } = await vehicleQuery;
      
      if (vehicleError) {
        console.error('[getCarsWithFilters] Error fetching vehicles:', vehicleError);
        console.error('[getCarsWithFilters] Error details:', JSON.stringify(vehicleError, null, 2));
        // Don't return empty - try to continue without vehicle filters
        console.log('[getCarsWithFilters] Continuing without vehicle-level filters due to error');
        hasVehicleFilters = false;
      } else if (!matchingVehicles || matchingVehicles.length === 0) {
        console.log('[getCarsWithFilters] No vehicles match filters');
        return [];
      } else {
        vehicleIds = matchingVehicles.map((v: any) => v.id);
        console.log(`[getCarsWithFilters] Found ${vehicleIds.length} matching vehicles`);
      }
    } catch (error) {
      console.error('[getCarsWithFilters] Exception in vehicle query:', error);
      console.log('[getCarsWithFilters] Continuing without vehicle-level filters due to exception');
      hasVehicleFilters = false;
    }
  } else {
    // No vehicle-level filters - we'll query all listings and filter in memory
    console.log('[getCarsWithFilters] No vehicle-level filters, will query all listings');
  }
  
  // Now get listings for these vehicles
  const allListings: any[] = [];
  
  if (vehicleIds.length > 0) {
    console.log(`[getCarsWithFilters] Querying listings for ${vehicleIds.length} vehicle IDs`);
    // Split into chunks if we have too many vehicle IDs (Supabase has limits on .in() size and HTTP headers)
    // Use smaller chunks to avoid HeadersOverflowError
    // Also limit total vehicles queried for performance (can increase if needed)
    const maxVehiclesToQuery = 2000; // Limit to first 2000 vehicles for performance
    const limitedVehicleIds = vehicleIds.slice(0, maxVehiclesToQuery);
    const chunkSize = 100; // Small chunks to avoid HTTP header overflow
    const vehicleIdChunks: string[][] = [];
    for (let i = 0; i < limitedVehicleIds.length; i += chunkSize) {
      vehicleIdChunks.push(limitedVehicleIds.slice(i, i + chunkSize));
    }
    
    if (vehicleIds.length > maxVehiclesToQuery) {
      console.log(`[getCarsWithFilters] Limiting to first ${maxVehiclesToQuery} vehicles for performance (out of ${vehicleIds.length} total)`);
    }
    
    console.log(`[getCarsWithFilters] Split into ${vehicleIdChunks.length} chunks`);
    
    // Query listings for these vehicles (with pagination per chunk)
    for (const chunk of vehicleIdChunks) {
      
      let pageSize = 1000;
      let from = 0;
      let chunkHasMore = true;
      
      while (chunkHasMore) {
        // Query listings first, then join with vehicles separately to avoid join query issues
        let query = supabaseAdmin
          .from('listings')
          .select('listing_id, vehicle_id, price, mileage, lat, lon, features, is_available, created_at')
          .eq('is_available', true)
          .in('vehicle_id', chunk)
          .range(from, from + pageSize - 1)
          .order('created_at', { ascending: false });

        // Apply listing-level filters
        if (filters.budgetMin) {
          query = query.gte('price', Math.floor(filters.budgetMin / 100)); // Convert cents to dollars
        }
        if (filters.budgetMax) {
          query = query.lte('price', Math.floor(filters.budgetMax / 100)); // Convert cents to dollars
        }
        if (filters.mileageMax) {
          query = query.lte('mileage', filters.mileageMax);
        }
        
        // Filter by city coordinates if city is specified (for performance - filter at DB level)
        if (filters.city && filters.latitude && filters.longitude) {
          // Use a reasonable radius for city filtering (e.g., 50 miles)
          // This will be refined later in memory, but helps reduce data fetched
          const cityRadius = filters.radiusMiles || 50;
          // Approximate bounding box for city (rough filter, will be refined)
          const latRange = cityRadius / 69; // ~69 miles per degree latitude
          const lonRange = cityRadius / (69 * Math.cos(filters.latitude * Math.PI / 180));
          query = query
            .gte('lat', filters.latitude - latRange)
            .lte('lat', filters.latitude + latRange)
            .gte('lon', filters.longitude - lonRange)
            .lte('lon', filters.longitude + lonRange);
        }

        // Fetch listings for this chunk/page
        const { data, error } = await query;

        if (error) {
          console.error('[getCarsWithFilters] Error fetching listings:', error);
          console.error('[getCarsWithFilters] Error details:', JSON.stringify(error, null, 2));
          chunkHasMore = false;
          break;
        }

        if (data && data.length > 0) {
          console.log(`[getCarsWithFilters] Found ${data.length} listings in chunk (page ${Math.floor(from/pageSize) + 1})`);
          
          // Now fetch vehicle data for these listings
          // Split vehicle IDs into smaller chunks to avoid header overflow
          const vehicleIdsForThisPage = [...new Set(data.map((l: any) => l.vehicle_id))];
          const vehicleMap = new Map();
          
          // Fetch vehicles in small chunks to avoid HTTP header overflow
          const vehicleChunkSize = 100;
          for (let i = 0; i < vehicleIdsForThisPage.length; i += vehicleChunkSize) {
            const vehicleChunk = vehicleIdsForThisPage.slice(i, i + vehicleChunkSize);
            const { data: vehiclesData } = await supabaseAdmin
              .from('vehicles_master')
              .select('id, make, model, base_model, year, drive, transmission, fuel_type, mpg_city, mpg_hwy, size_class, cylinders, engine_displacement')
              .in('id', vehicleChunk);
            
            if (vehiclesData) {
              vehiclesData.forEach((v: any) => vehicleMap.set(v.id, v));
            }
          }
          
          // Attach vehicle data to listings
          const listingsWithVehicles = data.map((listing: any) => ({
            ...listing,
            vehicles_master: vehicleMap.get(listing.vehicle_id) || null
          }));
          
          allListings.push(...listingsWithVehicles);
          
          if (data.length < pageSize) {
            chunkHasMore = false;
          } else {
            from += pageSize;
          }
        } else {
          chunkHasMore = false;
        }
      }
    }
  } else {
    // No vehicle filters - query all available listings with pagination
    console.log('[getCarsWithFilters] Querying all listings with pagination...');
    const maxListingsToQuery = 5000; // Limit for performance
    let totalQueried = 0;
    let pageSize = 1000;
    let from = 0;
    let hasMore = true;
    
    while (hasMore) {
      let query = supabaseAdmin
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
        .eq('is_available', true)
        .range(from, from + pageSize - 1)
        .order('created_at', { ascending: false });

      // Apply listing-level filters
      if (filters.budgetMin) {
        query = query.gte('price', Math.floor(filters.budgetMin / 100));
      }
      if (filters.budgetMax) {
        query = query.lte('price', Math.floor(filters.budgetMax / 100));
      }
      if (filters.mileageMax) {
        query = query.lte('mileage', filters.mileageMax);
      }
      
      // Filter by city coordinates if city is specified (for performance - filter at DB level)
      if (filters.city && filters.latitude && filters.longitude) {
        // Use a reasonable radius for city filtering (e.g., 50 miles)
        // This will be refined later in memory, but helps reduce data fetched
        const cityRadius = filters.radiusMiles || 50;
        // Approximate bounding box for city (rough filter, will be refined)
        const latRange = cityRadius / 69; // ~69 miles per degree latitude
        const lonRange = cityRadius / (69 * Math.cos(filters.latitude * Math.PI / 180));
        query = query
          .gte('lat', filters.latitude - latRange)
          .lte('lat', filters.latitude + latRange)
          .gte('lon', filters.longitude - lonRange)
          .lte('lon', filters.longitude + lonRange);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[getCarsWithFilters] Error fetching all listings:', error);
        console.error('[getCarsWithFilters] Error details:', JSON.stringify(error, null, 2));
        break; // Stop pagination on error
      }

      if (data && data.length > 0) {
        console.log(`[getCarsWithFilters] Found ${data.length} listings (page ${Math.floor(from/pageSize) + 1})`);
        
          // Fetch vehicle data for these listings
          // Split vehicle IDs into smaller chunks to avoid header overflow
          const vehicleIdsForThisPage = [...new Set(data.map((l: any) => l.vehicle_id))];
          const vehicleMap = new Map();
          
          // Fetch vehicles in small chunks
          const vehicleChunkSize = 100;
          for (let i = 0; i < vehicleIdsForThisPage.length; i += vehicleChunkSize) {
            const vehicleChunk = vehicleIdsForThisPage.slice(i, i + vehicleChunkSize);
            const { data: vehiclesData } = await supabaseAdmin
              .from('vehicles_master')
              .select('id, make, model, base_model, year, drive, transmission, fuel_type, mpg_city, mpg_hwy, size_class, cylinders, engine_displacement')
              .in('id', vehicleChunk);
            
            if (vehiclesData) {
              vehiclesData.forEach((v: any) => vehicleMap.set(v.id, v));
            }
          }
        
        // Attach vehicle data to listings
        const listingsWithVehicles = data.map((listing: any) => ({
          ...listing,
          vehicles_master: vehicleMap.get(listing.vehicle_id) || null
        }));
        
        allListings.push(...listingsWithVehicles);
        totalQueried += data.length;
        from += pageSize;
        
        if (data.length < pageSize || totalQueried >= maxListingsToQuery) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
    
    if (totalQueried >= maxListingsToQuery) {
      console.log(`[getCarsWithFilters] Reached limit of ${maxListingsToQuery} listings for performance`);
    }
    
    console.log(`[getCarsWithFilters] Total listings fetched: ${allListings.length}`);
  }
  
  console.log(`[getCarsWithFilters] Total listings before mapping: ${allListings.length}`);

  if (allListings.length === 0) {
    console.log(`[getCarsWithFilters] Found 0 listings after querying all chunks`);
    return [];
  }
  
  const data = allListings;

  // Map listings + vehicles_master to Car interface
  // Handle both single object and array responses from Supabase
  const listingsWithVehicles = data.filter((item: any) => {
    // Supabase can return vehicles_master as an object or array
    const vehicle = Array.isArray(item.vehicles_master) 
      ? item.vehicles_master[0] 
      : item.vehicles_master;
    
    if (!vehicle) {
      console.warn('[getCarsWithFilters] Listing missing vehicle data:', item.listing_id);
      return false;
    }
    // Store the vehicle in a consistent format
    item.vehicles_master = vehicle;
    return true;
  });
  console.log(`[getCarsWithFilters] Listings with vehicle data: ${listingsWithVehicles.length} out of ${data.length}`);
  
  if (listingsWithVehicles.length === 0) {
    console.error('[getCarsWithFilters] No listings have vehicle data! This might indicate a foreign key issue.');
    console.error('[getCarsWithFilters] Sample listing (first 3):', JSON.stringify(data.slice(0, 3), null, 2));
    return [];
  }
  
  let cars: Car[] = listingsWithVehicles
    .map((item: any) => {
      try {
        const listing = item;
        const vehicle = item.vehicles_master;
        
        if (!vehicle) {
          console.warn('[getCarsWithFilters] Skipping listing without vehicle:', listing.listing_id);
          return null;
        }
        
        // Map size_class to body_type (improved mapping)
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
        // Default to sedan for everything else
        bodyType = 'sedan';
      }
      
      // Map drive to drivetrain - handle various AWD formats
      let drivetrain = vehicle.drive?.toLowerCase() || '';
      // Handle various AWD formats: "All-Wheel Drive", "4-Wheel or All-Wheel Drive", "4-Wheel Drive", etc.
      if (drivetrain.includes('4-wheel') || drivetrain.includes('all-wheel') || 
          drivetrain.includes('4wd') || drivetrain.includes('awd') ||
          (drivetrain.includes('wheel drive') && (drivetrain.includes('4') || drivetrain.includes('all')))) {
        drivetrain = 'awd';
      } else if (drivetrain.includes('front') || drivetrain.includes('fwd')) {
        drivetrain = 'fwd';
      } else if (drivetrain.includes('rear') || drivetrain.includes('rwd')) {
        drivetrain = 'rwd';
      }
      
      // Convert features from JSONB array to string array
      const features = Array.isArray(listing.features) 
        ? listing.features.map((f: any) => typeof f === 'string' ? f : String(f))
        : [];
      
      // Derive city/state from coordinates (approximate - using nearest metro)
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
      
      return {
        id: listing.listing_id, // Use listing_id as the car id
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
      } as Car;
      } catch (error) {
        console.error('[getCarsWithFilters] Error mapping listing to car:', error, item);
        return null;
      }
    })
    .filter((car: Car | null): car is Car => {
      return car !== null;
    })
    .filter((car: Car) => {
      // STRICT filtering - all criteria must match exactly
      
      // Year must be within range (if specified)
      if (filters.yearMin && car.year < filters.yearMin) {
        return false;
      }
      if (filters.yearMax && car.year > filters.yearMax) {
        return false;
      }
      
      // Drivetrain must match exactly (case-insensitive)
      if (filters.drivetrain && filters.drivetrain.length > 0) {
        const carDrivetrain = car.drivetrain?.toLowerCase() || '';
        const filterDrivetrains = filters.drivetrain.map(d => d.toLowerCase());
        // Check if user wants AWD/4WD
        const wantsAWD = filterDrivetrains.includes('awd') || filterDrivetrains.includes('4wd');
        // Car drivetrain should already be normalized to 'awd' during mapping, but double-check
        const isAWD = carDrivetrain === 'awd' || carDrivetrain === '4wd';
        
        if (wantsAWD) {
          // User wants AWD - car must be AWD
          if (!isAWD) {
            return false;
          }
        } else {
          // User wants specific drivetrain - must match exactly
          if (!carDrivetrain || !filterDrivetrains.includes(carDrivetrain)) {
            return false;
          }
        }
      }
      
      // Body type must match exactly
      if (filters.bodyType && filters.bodyType.length > 0) {
        const carBodyType = car.body_type?.toLowerCase();
        const filterBodyTypes = filters.bodyType.map(b => b.toLowerCase());
        if (!carBodyType || !filterBodyTypes.includes(carBodyType)) {
          return false;
        }
      }
      
      // Price must be strictly under budgetMax (if specified)
      if (filters.budgetMax && car.price_cents > filters.budgetMax) {
        return false;
      }
      
      // Price must be at least budgetMin (if specified)
      if (filters.budgetMin && car.price_cents < filters.budgetMin) {
        return false;
      }
      
      // Model must match (if specified) - be flexible with matching
      if (filters.model && filters.model.length > 0) {
        const carModel = car.model?.toLowerCase() || '';
        const carTrim = car.trim?.toLowerCase() || '';
        const filterModels = filters.model.map(m => m.toLowerCase());
        // Check if any filter model is contained in car model or trim (or vice versa)
        const matchesModel = filterModels.some(m => 
          carModel.includes(m) || m.includes(carModel) || 
          carModel.replace(/\s+/g, '').includes(m.replace(/\s+/g, ''))
        );
        const matchesTrim = filterModels.some(m => 
          carTrim.includes(m) || m.includes(carTrim) ||
          carTrim.replace(/\s+/g, '').includes(m.replace(/\s+/g, ''))
        );
        if (!matchesModel && !matchesTrim) {
          return false;
        }
      }
      
      // Transmission must match (if specified)
      if (filters.transmission && filters.transmission.length > 0) {
        const carTransmission = car.transmission?.toLowerCase();
        const filterTransmissions = filters.transmission.map(t => t.toLowerCase());
        if (!carTransmission || !filterTransmissions.includes(carTransmission)) {
          return false;
        }
      }
      
      // Seats must be at least the minimum (if specified)
      if (filters.seats && car.seats) {
        if (car.seats < filters.seats) {
          return false;
        }
      }
      
      // Features must include at least one (if specified)
      if (filters.features && filters.features.length > 0) {
        if (!car.features || car.features.length === 0) {
          return false;
        }
        const carFeatures = car.features.map(f => f.toLowerCase());
        const filterFeatures = filters.features.map(f => f.toLowerCase());
        const hasFeature = filterFeatures.some(f => carFeatures.some(cf => cf.includes(f) || f.includes(cf)));
        if (!hasFeature) {
          return false;
        }
      }
      
      return true;
    });

  console.log(`[getCarsWithFilters] Found ${cars.length} cars after mapping and filtering`);

  // Filter by city name if provided (STRICT - only show cars from that city)
  if (filters.city) {
    const beforeCount = cars.length;
    const targetCity = filters.city.toLowerCase();
    cars = cars.filter(car => {
      const carCity = car.city?.toLowerCase();
      // Exact match required
      if (carCity === targetCity) {
        return true;
      }
      // Also check if coordinates are within city bounds (more accurate)
      // This handles cases where derived city might be slightly off due to nearest metro calculation
      if (filters.latitude && filters.longitude && car.latitude && car.longitude) {
        const distance = calculateDistance(
          filters.latitude,
          filters.longitude,
          car.latitude,
          car.longitude
        );
        // If within 30 miles of city center, consider it part of that city
        // This handles cases where derived city might be slightly off
        const cityRadius = filters.radiusMiles || 30;
        if (distance <= cityRadius) {
          return true;
        }
      }
      return false;
    });
    console.log(`[getCarsWithFilters] After city filter (${filters.city}): ${beforeCount} -> ${cars.length}`);
  }

  // Filter by location (radius) if provided
  if (filters.latitude && filters.longitude && filters.radiusMiles) {
    const beforeCount = cars.length;
    const carsWithCoords = cars.filter(car => car.latitude && car.longitude);
    console.log(`[getCarsWithFilters] Cars with coordinates: ${carsWithCoords.length} out of ${cars.length}`);
    
    const filteredByDistance = carsWithCoords.filter(car => {
      const distance = calculateDistance(
        filters.latitude!,
        filters.longitude!,
        car.latitude!,
        car.longitude!
      );
      return distance <= filters.radiusMiles!;
    });
    console.log(`[getCarsWithFilters] After location filter (${filters.radiusMiles}mi from ${filters.latitude},${filters.longitude}): ${beforeCount} -> ${filteredByDistance.length}`);
    
    // STRICT MODE: Only return cars within exact radius
    if (filteredByDistance.length > 0) {
      cars = filteredByDistance;
      console.log(`[getCarsWithFilters] Using distance-filtered results: ${cars.length} cars within ${filters.radiusMiles} miles`);
    } else {
      // Strict: if no cars within radius, return empty
      console.log(`[getCarsWithFilters] No cars within ${filters.radiusMiles} miles - returning empty (strict mode)`);
      cars = [];
    }
  }

  // Filter by features if provided
  if (filters.features && filters.features.length > 0) {
    cars = cars.filter(car => {
      if (!car.features) return false;
      return filters.features!.some(f => car.features!.includes(f));
    });
  }

  console.log(`[getCarsWithFilters] Final count: ${cars.length} cars`);
  return cars;
}

/**
 * Count similar cars in area for inventory boost
 */
async function countSimilarCarsInArea(
  car: Car,
  radiusMiles: number = 50,
  userLat?: number,
  userLon?: number
): Promise<number> {
  if (!userLat || !userLon) return 1;

  // Get vehicle IDs for same make/model
  const { data: vehicles } = await supabaseAdmin
    .from('vehicles_master')
    .select('id')
    .eq('make', car.make)
    .eq('model', car.model)
    .limit(1000);

  if (!vehicles || vehicles.length === 0) return 1;

  const vehicleIds = vehicles.map((v: any) => v.id);

  // Count listings for these vehicles
  const { count, error } = await supabaseAdmin
    .from('listings')
    .select('listing_id', { count: 'exact', head: true })
    .eq('is_available', true)
    .in('vehicle_id', vehicleIds);

  if (error) {
    console.warn('[countSimilarCarsInArea] Error counting:', error);
    return 1;
  }

  return count || 1;
}

/**
 * Generate reasons for a recommendation
 */
function generateReasons(
  car: Car,
  semanticScore: number,
  constraintScore: number,
  personalScore: number,
  queryText?: string,
  userProfile?: UserProfile,
  relaxations: any[] = []
): string[] {
  const reasons: string[] = [];

  if (queryText && semanticScore > 0.5) {
    reasons.push(`Matches your query: "${queryText}"`);
  }

  if (semanticScore > 0.7) {
    reasons.push('Highly relevant to your search');
  }

  if (constraintScore > 0.8) {
    reasons.push('Meets all your criteria');
  } else if (relaxations.length > 0) {
    const priceRelax = relaxations.find(r => r.constraint === 'max_price');
    if (priceRelax) {
      reasons.push(`Within budget after expanding max price`);
    }
    const radiusRelax = relaxations.find(r => r.constraint === 'radius');
    if (radiusRelax) {
      reasons.push(`Found after expanding search radius`);
    }
  }

  if (personalScore > 0.6 && userProfile) {
    if (userProfile.preferred_makes?.includes(car.make)) {
      reasons.push(`Matches your preferred brand: ${car.make}`);
    }
    if (userProfile.preferred_body_types?.includes(car.body_type)) {
      reasons.push(`Matches your preferred body type: ${car.body_type}`);
    }
    reasons.push('Based on your browsing history');
  }

  if (car.features && car.features.length > 0) {
    const featureCount = car.features.length;
    reasons.push(`Includes ${featureCount} premium features`);
  }

  return reasons.length > 0 ? reasons : ['Available in your area'];
}

/**
 * Main recommendation pipeline
 */
export async function recommendCars(
  userId: string | undefined,
  filters: SearchFilters
): Promise<RecommendationResponse> {
  try {
    const allRelaxations: any[] = [];
    let currentFilters = { ...filters };
    let stage = 0;
    const stageCounts: Record<string, number> = {};

    // Get user profile
    const { profile: userProfile, preferenceVector } = await getUserProfile(userId);

  // Generate query embedding if query text provided
  // Use hashed fallback to avoid sharp module issues (no external deps)
  let queryEmbedding: number[] | null = null;
  if (filters.queryText) {
    try {
      // Use hashed embedding from utils (no external deps, no sharp)
      const { generateHashedEmbedding } = await import('./utils');
      queryEmbedding = generateHashedEmbedding(filters.queryText);
      console.log('[recommendCars] Generated hashed query embedding');
    } catch (error: any) {
      console.warn('[recommendCars] Failed to generate embedding, continuing without semantic search:', error?.message || error);
      queryEmbedding = null;
    }
  }

  // Stage 0: Initial search
  // Always use getCarsWithFilters to ensure filters are properly applied
  // Semantic search is used for ranking, but we filter first
  // Fetch ALL matching cars (no limit)
  let cars: Car[] = await getCarsWithFilters(currentFilters, 100000);
  console.log(`[recommendCars] Stage 0: Found ${cars.length} cars after initial filtering`);
  
  // If we have a query embedding, re-rank by semantic similarity
  if (queryEmbedding && cars.length > 0) {
    // Score cars by semantic similarity
    const scoredCars = cars.map(car => {
      if (car.embedding && car.embedding.length > 0) {
        const similarity = cosineSimilarity(queryEmbedding, car.embedding);
        return { car, similarity };
      }
      // Give cars without embeddings a neutral score so they're not excluded
      return { car, similarity: 0.3 };
    });
    
    // Sort by similarity - keep ALL results (no limit)
    scoredCars.sort((a, b) => b.similarity - a.similarity);
    cars = scoredCars.map(item => item.car);
    console.log(`[recommendCars] After semantic re-ranking: ${cars.length} cars`);
  }

  stageCounts['stage_0'] = cars.length;

  // STRICT MODE: No relaxation - only show exact matches
  // If no results, return empty (user will see "No cars found")
  console.log(`[recommendCars] Strict filtering mode - returning ${cars.length} exact matches only`);

  // Score and rank cars
  const scoredCars: Array<RecommendationResult & { rawCar: Car }> = [];

  for (const car of cars) {
    // Semantic score
    let semanticScore = 0.5; // Default neutral
    if (queryEmbedding && car.embedding) {
      semanticScore = cosineSimilarity(queryEmbedding, car.embedding);
    }

    // Constraint score
    const constraintScore = calculateConstraintScore(car, currentFilters, userProfile);

    // Personal score
    const personalScore = calculatePersonalScore(car, userProfile, preferenceVector);

    // Inventory score
    let inventoryScore = 0.5; // Default neutral
    try {
      const similarCount = await countSimilarCarsInArea(
        car,
        currentFilters.radiusMiles || 50,
        currentFilters.latitude || userProfile?.latitude,
        currentFilters.longitude || userProfile?.longitude
      );
      inventoryScore = calculateInventoryScore(car, similarCount);
    } catch (error) {
      console.warn('[recommendCars] Error calculating inventory score:', error);
    }

    // Final score
    const finalScore = calculateFinalScore(
      semanticScore,
      constraintScore,
      personalScore,
      inventoryScore
    );

    // Generate reasons
    const reasons = generateReasons(
      car,
      semanticScore,
      constraintScore,
      personalScore,
      filters.queryText,
      userProfile,
      allRelaxations
    );

    scoredCars.push({
      car,
      score: finalScore,
      reasons,
      semantic_score: semanticScore,
      constraint_score: constraintScore,
      personal_score: personalScore,
      inventory_score: inventoryScore,
      rawCar: car,
    });
  }

  // Sort by score
  scoredCars.sort((a, b) => b.score - a.score);
  
  console.log(`[recommendCars] Scored ${scoredCars.length} cars, top 3 scores:`, scoredCars.slice(0, 3).map(s => s.score));

  // Return ALL results (no limit) - user wants to see all matching cars
  const topResults = scoredCars.map(({ rawCar, ...rest }) => rest);
  console.log(`[recommendCars] Returning ${topResults.length} results (all matching cars)`);

  // STRICT MODE: No alternatives - only show exact matches
  const alternatives: RecommendationResponse['alternatives'] = {
    comparables: [],
    nearby_deals: [],
    best_available: [],
  };

    return {
      results: topResults,
      relaxation_applied: allRelaxations,
      alternatives,
      debug: {
        stage_counts: stageCounts,
        top_signals: topResults.slice(0, 3).map(r => r.reasons[0] || 'No reason'),
        final_stage: `stage_${stage}`,
      },
    };
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const errorStack = error?.stack;
    const errorName = error?.name;
    
    console.error('[recommendCars] ❌ ERROR in recommendation pipeline');
    console.error('[recommendCars] Error message:', errorMessage);
    console.error('[recommendCars] Error name:', errorName);
    if (errorStack) {
      console.error('[recommendCars] Error stack:', errorStack);
    }
    console.error('[recommendCars] Full error:', error);
    
    // Return empty results with error info - this prevents the API from crashing
    return {
      results: [],
      relaxation_applied: [],
      alternatives: {
        comparables: [],
        nearby_deals: [],
        best_available: [],
      },
      debug: {
        stage_counts: { error: 1 },
        top_signals: [`Error: ${errorMessage}`],
        final_stage: 'error',
      },
    };
  }
}


