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
import { expandQuery, generateQueryVariations } from './queryExpansion';

const TARGET_RESULTS = 20; // Target number of results
const MIN_RESULTS = 8; // Minimum results before triggering fallbacks

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
  if (!supabaseAdmin) return [];
  
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
  if (!supabaseAdmin) {
    console.error('[getCarsWithFilters] supabaseAdmin is not initialized');
    return [];
  }
  
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
        // Model is a HARD constraint - filter at database level if possible
        // Since Supabase doesn't easily support OR with multiple ilike, we'll filter in memory
        // But we log it clearly that model is a hard constraint that will never be relaxed
        console.log('[getCarsWithFilters] Model filter (HARD CONSTRAINT - will filter in memory):', filters.model);
        // We'll apply strict model filter later in memory after fetching
      }
      if (filters.yearMin) {
        vehicleQuery = vehicleQuery.gte('year', filters.yearMin);
      }
      if (filters.yearMax) {
        vehicleQuery = vehicleQuery.lte('year', filters.yearMax);
      }
      if (filters.fuelType && filters.fuelType.length > 0) {
        // Fuel type filtering will be done in-memory for case-insensitive matching
        // The database might have "Hybrid" but filter is "hybrid", so we filter in memory
        console.log('[getCarsWithFilters] Will filter by fuel type in memory:', filters.fuelType);
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
      // PRIORITY-BASED filtering:
      // 1. Model/Make are PRIMARY (hard constraints) - always enforced
      // 2. Other filters are SECONDARY - can be relaxed if model is specified
      
      // PRIMARY: Model must match EXACTLY (if specified) - this is ALWAYS a hard constraint
      if (filters.model && filters.model.length > 0) {
        const carModel = car.model?.toLowerCase().trim() || '';
        const carTrim = car.trim?.toLowerCase().trim() || '';
        const filterModels = filters.model.map(m => m.toLowerCase().trim());
        
        // STRICT matching: model must exactly match or be contained as a whole word
        const matchesModel = filterModels.some(filterModel => {
          if (carModel === filterModel) return true;
          const modelWords = carModel.split(/\s+/);
          if (modelWords.includes(filterModel)) return true;
          const filterWords = filterModel.split(/\s+/);
          if (filterWords.includes(carModel)) return true;
          if (carTrim && (carTrim === filterModel || carTrim.includes(filterModel) || filterModel.includes(carTrim))) {
            return true;
          }
          return false;
        });
        
        if (!matchesModel) {
          return false; // Model is hard constraint - reject immediately
        }
      }
      
      // PRIMARY: Make must match (if specified) - check this early
      if (filters.make && filters.make.length > 0) {
        const carMake = car.make?.toLowerCase();
        const filterMakes = filters.make.map(m => m.toLowerCase());
        if (!carMake || !filterMakes.includes(carMake)) {
          return false;
        }
      }
      
      // SECONDARY: Year must be within range (if specified)
      if (filters.yearMin && car.year < filters.yearMin) {
        return false;
      }
      if (filters.yearMax && car.year > filters.yearMax) {
        return false;
      }
      
      // SECONDARY: Price must be strictly under budgetMax (if specified)
      if (filters.budgetMax && car.price_cents > filters.budgetMax) {
        return false;
      }
      
      // SECONDARY: Price must be at least budgetMin (if specified)
      if (filters.budgetMin && car.price_cents < filters.budgetMin) {
        return false;
      }
      
      // SECONDARY: Body type must match exactly
      if (filters.bodyType && filters.bodyType.length > 0) {
        const carBodyType = car.body_type?.toLowerCase();
        const filterBodyTypes = filters.bodyType.map(b => b.toLowerCase());
        if (!carBodyType || !filterBodyTypes.includes(carBodyType)) {
          return false;
        }
      }
      
      // SECONDARY: Drivetrain - will be handled separately if model is specified
      // (We'll apply this filter, but if no results, we'll relax it while keeping model)
      
      // SECONDARY: Fuel type, transmission, seats, features - all secondary
      
      // Transmission must match (if specified)
      if (filters.transmission && filters.transmission.length > 0) {
        const carTransmission = car.transmission?.toLowerCase();
        const filterTransmissions = filters.transmission.map(t => t.toLowerCase());
        if (!carTransmission || !filterTransmissions.includes(carTransmission)) {
          return false;
        }
      }
      
      // Fuel type must match exactly (case-insensitive)
      if (filters.fuelType && filters.fuelType.length > 0) {
        const carFuelType = car.fuel_type?.toLowerCase() || '';
        const filterFuelTypes = filters.fuelType.map(f => f.toLowerCase());
        if (!carFuelType || !filterFuelTypes.includes(carFuelType)) {
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

  console.log(`[getCarsWithFilters] Found ${cars.length} cars after primary filtering (model/make/year/price/body)`);
  
  // PRIORITY LOGIC: If model is specified, apply drivetrain filter with fallback
  // First try with drivetrain filter, if no results, relax drivetrain but keep model
  if (filters.model && filters.model.length > 0 && filters.drivetrain && filters.drivetrain.length > 0) {
    const beforeDrivetrainFilter = cars.length;
    const carsWithDrivetrain = cars.filter(car => {
      const carDrivetrain = car.drivetrain?.toLowerCase() || '';
      const filterDrivetrains = filters.drivetrain!.map(d => d.toLowerCase());
      const wantsAWD = filterDrivetrains.includes('awd') || filterDrivetrains.includes('4wd');
      const isAWD = carDrivetrain === 'awd' || carDrivetrain === '4wd';
      
      if (wantsAWD) {
        return isAWD;
      } else {
        return carDrivetrain && filterDrivetrains.includes(carDrivetrain);
      }
    });
    
    console.log(`[getCarsWithFilters] Model + Drivetrain filter: ${beforeDrivetrainFilter} -> ${carsWithDrivetrain.length} cars`);
    
    // If we have results with drivetrain filter, use them
    // If no results, keep all cars (model match but drivetrain relaxed)
    if (carsWithDrivetrain.length > 0) {
      cars = carsWithDrivetrain;
      console.log(`[getCarsWithFilters] ✅ Using ${cars.length} cars matching model + drivetrain`);
    } else {
      console.log(`[getCarsWithFilters] ⚠️ No cars match model + drivetrain. Keeping ${cars.length} cars matching model (drivetrain relaxed)`);
      // cars already filtered by model, so we keep them (drivetrain is relaxed)
    }
  } else if (filters.drivetrain && filters.drivetrain.length > 0) {
    // If no model specified, apply drivetrain filter normally
    const beforeDrivetrainFilter = cars.length;
    cars = cars.filter(car => {
      const carDrivetrain = car.drivetrain?.toLowerCase() || '';
      const filterDrivetrains = filters.drivetrain!.map(d => d.toLowerCase());
      const wantsAWD = filterDrivetrains.includes('awd') || filterDrivetrains.includes('4wd');
      const isAWD = carDrivetrain === 'awd' || carDrivetrain === '4wd';
      
      if (wantsAWD) {
        return isAWD;
      } else {
        return carDrivetrain && filterDrivetrains.includes(carDrivetrain);
      }
    });
    console.log(`[getCarsWithFilters] Drivetrain filter (no model): ${beforeDrivetrainFilter} -> ${cars.length} cars`);
  }
  
  console.log(`[getCarsWithFilters] Applied filters:`, {
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
    city: filters.city,
    radiusMiles: filters.radiusMiles,
  });

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
  if (!userLat || !userLon || !supabaseAdmin) return 1;

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
    let relaxationStage = 0; // Track relaxation stage for progressive constraint relaxation
    const stageCounts: Record<string, number> = {};

    // Get user profile
    const { profile: userProfile, preferenceVector } = await getUserProfile(userId);

  // Query Expansion: Expand query with synonyms and related terms
  let expandedQueries: string[] = [];
  if (filters.queryText) {
    expandedQueries = expandQuery(filters.queryText);
    console.log(`[recommendCars] Query expansion: ${expandedQueries.length} query variations`);
  }

  // Generate query embedding(s) - use best expanded query or original
  let queryEmbedding: number[] | null = null;
  const queryToEmbed = expandedQueries.length > 0 ? expandedQueries[0] : filters.queryText;
  if (queryToEmbed) {
    try {
      const { generateHashedEmbedding } = await import('./utils');
      queryEmbedding = generateHashedEmbedding(queryToEmbed);
      console.log('[recommendCars] Generated hashed query embedding');
    } catch (error: any) {
      console.warn('[recommendCars] Failed to generate embedding, continuing without semantic search:', error?.message || error);
      queryEmbedding = null;
    }
  }

  // Stage 0: Initial search with strict filters
  console.log('[recommendCars] Starting Stage 0 with filters:', JSON.stringify(currentFilters, null, 2));
  let cars: Car[] = await getCarsWithFilters(currentFilters, 10000);
  console.log(`[recommendCars] Stage 0: Found ${cars.length} cars after initial filtering`);
  stageCounts['stage_0'] = cars.length;
  
  if (cars.length === 0) {
    console.warn('[recommendCars] ⚠️ Stage 0 returned 0 cars - will attempt relaxation');
  }
  
  // If we have a query embedding, re-rank by semantic similarity
  if (queryEmbedding && cars.length > 0) {
    const scoredCars = cars.map(car => {
      if (car.embedding && car.embedding.length > 0) {
        const similarity = cosineSimilarity(queryEmbedding, car.embedding);
        return { car, similarity };
      }
      return { car, similarity: 0.3 };
    });
    scoredCars.sort((a, b) => b.similarity - a.similarity);
    cars = scoredCars.map(item => item.car);
    console.log(`[recommendCars] After semantic re-ranking: ${cars.length} cars`);
  }

  // Progressive Relaxation: If results < MIN_RESULTS, relax constraints
  while (cars.length < MIN_RESULTS && relaxationStage < 6) {
    relaxationStage++;
    const { filters: relaxedFilters, relaxations } = applyRelaxation(currentFilters, relaxationStage);
    
    if (relaxations.length === 0) {
      // No more relaxations possible
      break;
    }
    
    allRelaxations.push(...relaxations);
    currentFilters = relaxedFilters;
    
    console.log(`[recommendCars] Stage ${relaxationStage}: Relaxing constraints, relaxations:`, relaxations);
    
    // Re-search with relaxed filters
    cars = await getCarsWithFilters(currentFilters, 10000);
    stageCounts[`stage_${relaxationStage}`] = cars.length;
    console.log(`[recommendCars] Stage ${relaxationStage}: Found ${cars.length} cars after relaxation`);
    
    // Re-rank if we have query embedding
    if (queryEmbedding && cars.length > 0) {
      const scoredCars = cars.map(car => {
        if (car.embedding && car.embedding.length > 0) {
          return { car, similarity: cosineSimilarity(queryEmbedding, car.embedding) };
        }
        return { car, similarity: 0.3 };
      });
      scoredCars.sort((a, b) => b.similarity - a.similarity);
      cars = scoredCars.map(item => item.car);
    }
  }

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

  // Take top TARGET_RESULTS
  const topResults = scoredCars.slice(0, TARGET_RESULTS).map(({ rawCar, ...rest }) => rest);
  console.log(`[recommendCars] Returning ${topResults.length} top results`);

  // Zero-Match Fallbacks: Generate alternatives if we have few results
  const alternatives: RecommendationResponse['alternatives'] = {
    comparables: [],
    nearby_deals: [],
    best_available: [],
  };

  // If we have results but less than MIN_RESULTS, or if we have a specific car in mind, find comparables
  if (topResults.length > 0 && topResults.length < MIN_RESULTS) {
    const topCar = topResults[0].car;
    try {
      // Get a larger pool of cars for finding comparables (relaxed filters)
      const relaxedFiltersForComparables = {
        ...currentFilters,
        // Remove strict constraints for comparables search
        budgetMax: currentFilters.budgetMax ? currentFilters.budgetMax * 1.3 : undefined,
        radiusMiles: (currentFilters.radiusMiles || 50) * 2,
      };
      const allCarsPool = await getCarsWithFilters(relaxedFiltersForComparables, 1000);
      const comparables = findComparables(topCar, allCarsPool, 5);
      alternatives.comparables = comparables.map(c => ({
        car: c.car,
        similarity_reason: c.similarity_reason,
      }));
      console.log(`[recommendCars] Found ${comparables.length} comparable cars`);
    } catch (error) {
      console.warn('[recommendCars] Error finding comparables:', error);
    }
  }

  // If we have very few or no results, find nearby deals
  if (topResults.length < MIN_RESULTS) {
    try {
      // Use relaxed filters for nearby deals
      const relaxedFiltersForDeals = {
        ...currentFilters,
        budgetMax: currentFilters.budgetMax ? currentFilters.budgetMax * 1.5 : undefined,
        radiusMiles: (currentFilters.radiusMiles || 50) * 3,
      };
      const allCarsPool = await getCarsWithFilters(relaxedFiltersForDeals, 1000);
      const nearbyDeals = findNearbyDeals(
        allCarsPool,
        currentFilters.latitude || userProfile?.latitude,
        currentFilters.longitude || userProfile?.longitude,
        currentFilters.radiusMiles || 100, // Wider radius for deals
        5
      );
      alternatives.nearby_deals = nearbyDeals.map(d => ({
        car: d.car,
        reason: d.reason,
      }));
      console.log(`[recommendCars] Found ${nearbyDeals.length} nearby deals`);
    } catch (error) {
      console.warn('[recommendCars] Error finding nearby deals:', error);
    }
  }

  // If we have zero results, show best available (top cars in area)
  if (topResults.length === 0) {
    try {
      console.log('[recommendCars] Zero results - fetching best available cars with minimal filters');
      // Try with minimal filters first (just location if specified)
      const minimalFilters: SearchFilters = {};
      if (currentFilters.latitude && currentFilters.longitude) {
        minimalFilters.latitude = currentFilters.latitude;
        minimalFilters.longitude = currentFilters.longitude;
        minimalFilters.radiusMiles = (currentFilters.radiusMiles || 15) * 5; // Much wider radius
      }
      if (currentFilters.city) {
        minimalFilters.city = currentFilters.city;
      }
      
      let allCarsPool = await getCarsWithFilters(minimalFilters, 500);
      console.log(`[recommendCars] Best available pool: ${allCarsPool.length} cars with minimal filters`);
      
      // If still no results, try with completely empty filters
      if (allCarsPool.length === 0) {
        console.log('[recommendCars] No cars with minimal filters - trying completely empty filters');
        allCarsPool = await getCarsWithFilters({}, 500);
        console.log(`[recommendCars] Best available pool (empty filters): ${allCarsPool.length} cars`);
      }
      
      // Sort by price (ascending) and take top 10 as "best available"
      const bestAvailable = allCarsPool
        .filter(c => c.is_available)
        .sort((a, b) => a.price_cents - b.price_cents)
        .slice(0, 10)
        .map(car => ({
          car,
          reason: 'Best available options in your area',
        }));
      alternatives.best_available = bestAvailable;
      console.log(`[recommendCars] Found ${bestAvailable.length} best available cars`);
      
      // If we still have no results, return the best available as main results
      if (topResults.length === 0 && bestAvailable.length > 0) {
        console.log('[recommendCars] Returning best available as main results since no matches found');
        return {
          results: bestAvailable.map(item => ({
            car: item.car,
            score: 0.5,
            reasons: [item.reason],
            semantic_score: 0.3,
            constraint_score: 0.3,
            personal_score: 0.3,
            inventory_score: 0.3,
          })),
          relaxation_applied: allRelaxations,
          alternatives: {
            comparables: [],
            nearby_deals: [],
            best_available: [],
          },
          debug: {
            stage_counts: stageCounts,
            top_signals: ['No exact matches found - showing best available'],
            final_stage: `stage_${relaxationStage}`,
          },
        };
      }
    } catch (error) {
      console.warn('[recommendCars] Error finding best available:', error);
    }
  }

  return {
    results: topResults,
    relaxation_applied: allRelaxations,
    alternatives,
    debug: {
      stage_counts: stageCounts,
      top_signals: topResults.slice(0, 3).map(r => r.reasons[0] || 'No reason'),
      final_stage: `stage_${relaxationStage}`,
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


