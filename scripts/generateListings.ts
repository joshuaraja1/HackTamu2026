import { supabaseAdmin } from '../app/lib/supabaseAdmin';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  size_class: string | null;
  drive: string | null;
  fuel_type: string | null;
  mpg_city: number | null;
  mpg_hwy: number | null;
  engine_displacement: number | null;
  cylinders: number | null;
}

interface Listing {
  vehicle_id: string;
  price: number;
  mileage: number;
  lat: number;
  lon: number;
  features: string[];
  created_at: string;
}

// Metro clusters
const METROS = [
  { name: 'Dallas', lat: 32.7767, lon: -96.7970 },
  { name: 'Austin', lat: 30.2672, lon: -97.7431 },
  { name: 'Houston', lat: 29.7604, lon: -95.3698 },
  { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  { name: 'NYC', lat: 40.7128, lon: -74.0060 },
  { name: 'Chicago', lat: 41.8781, lon: -87.6298 },
];

const FEATURES = [
  'carplay',
  'android_auto',
  'heated_seats',
  'lane_assist',
  'adaptive_cruise',
  'sunroof',
  'awd',
  'third_row',
  'backup_camera',
  'blind_spot',
  'remote_start',
  'leather',
  'navigation',
  'premium_audio',
];

function randomNormal(mean: number, stdDev: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

function getBasePrice(sizeClass: string | null, make: string): number {
  const luxuryMakes = ['BMW', 'Mercedes', 'Audi', 'Porsche', 'Lexus', 'Infiniti', 'Acura', 'Cadillac', 'Lincoln'];
  const isLuxury = luxuryMakes.some(m => make.toUpperCase().includes(m.toUpperCase()));
  const luxuryMultiplier = isLuxury ? 1.5 : 1.0;

  const sizeMultipliers: Record<string, number> = {
    'Two Seaters': 20000,
    'Subcompact Cars': 18000,
    'Compact Cars': 22000,
    'Midsize Cars': 28000,
    'Large Cars': 35000,
    'Small Sport Utility Vehicle 2WD': 30000,
    'Small Sport Utility Vehicle 4WD': 35000,
    'Standard Sport Utility Vehicle 2WD': 45000,
    'Standard Sport Utility Vehicle 4WD': 50000,
    'Small Pickup Trucks 2WD': 28000,
    'Small Pickup Trucks 4WD': 32000,
    'Standard Pickup Trucks 2WD': 40000,
    'Standard Pickup Trucks 4WD': 45000,
    'Minivan - 2WD': 32000,
    'Minivan - 4WD': 35000,
  };

  const base = sizeMultipliers[sizeClass || ''] || 25000;
  return base * luxuryMultiplier;
}

function calculatePrice(vehicle: Vehicle, mileage: number): number {
  const currentYear = new Date().getFullYear();
  const age = currentYear - vehicle.year;
  const basePrice = getBasePrice(vehicle.size_class, vehicle.make);

  // Depreciation: exponential decay
  const depreciationFactor = Math.exp(-0.08 * age);
  let price = basePrice * depreciationFactor;

  // Mileage impact
  const mileagePenalty = (mileage / 1000) * (10 + Math.random() * 25);
  price -= mileagePenalty;

  // Add some noise
  price *= (0.85 + Math.random() * 0.3);

  // Clamp to reasonable range
  return Math.round(clamp(1500, 120000, price));
}

function generateMileage(vehicle: Vehicle): number {
  const currentYear = new Date().getFullYear();
  const age = currentYear - vehicle.year;
  const typicalMiles = age * 12000;
  const mileage = typicalMiles + randomNormal(0, typicalMiles * 0.2);
  return Math.round(clamp(0, 300000, mileage));
}

function generateLocation(): { lat: number; lon: number } {
  const metro = METROS[Math.floor(Math.random() * METROS.length)];
  const jitter = 0.15;
  return {
    lat: metro.lat + (Math.random() - 0.5) * jitter,
    lon: metro.lon + (Math.random() - 0.5) * jitter,
  };
}

function generateFeatures(vehicle: Vehicle): string[] {
  const features: string[] = [];
  const currentYear = new Date().getFullYear();
  const age = currentYear - vehicle.year;

  // Tech features more likely in newer cars
  const techProbability = Math.min(0.9, 0.3 + (currentYear - vehicle.year) * 0.05);
  if (Math.random() < techProbability) features.push('backup_camera');
  if (Math.random() < techProbability * 0.8) features.push('carplay');
  if (Math.random() < techProbability * 0.7) features.push('android_auto');
  if (Math.random() < techProbability * 0.6) features.push('lane_assist');
  if (Math.random() < techProbability * 0.5) features.push('adaptive_cruise');
  if (Math.random() < techProbability * 0.4) features.push('blind_spot');

  // Comfort features
  if (Math.random() < 0.4) features.push('heated_seats');
  if (Math.random() < 0.3) features.push('remote_start');
  if (Math.random() < 0.3) features.push('sunroof');
  if (Math.random() < 0.2) features.push('leather');
  if (Math.random() < 0.2) features.push('navigation');
  if (Math.random() < 0.15) features.push('premium_audio');

  // SUV-specific
  if (vehicle.size_class?.includes('Sport Utility') && Math.random() < 0.4) {
    features.push('third_row');
  }

  // AWD if drive indicates it
  if (vehicle.drive?.toLowerCase().includes('4-wheel') || 
      vehicle.drive?.toLowerCase().includes('all-wheel') ||
      vehicle.drive?.toLowerCase().includes('awd')) {
    features.push('awd');
  }

  return features;
}

function getListingCount(vehicle: Vehicle): number {
  const popularMakes = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan'];
  const isPopular = popularMakes.some(m => vehicle.make.toUpperCase().includes(m.toUpperCase()));
  
  // Popular makes: 1-3 listings (bias toward 2)
  // Others: 1-2 listings (bias toward 1)
  if (isPopular) {
    const rand = Math.random();
    if (rand < 0.4) return 1;
    if (rand < 0.8) return 2;
    return 3;
  } else {
    const rand = Math.random();
    if (rand < 0.7) return 1;
    return 2;
  }
}

function generateCreatedAt(): string {
  const daysAgo = Math.floor(Math.random() * 120);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

async function generateListings() {
  console.log('📋 Starting listing generation...\n');

  // Fetch all vehicles using pagination (Supabase default limit is 1000)
  console.log('📥 Fetching vehicles from vehicles_master...');
  const allVehicles: Vehicle[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: vehicles, error: fetchError } = await supabaseAdmin
      .from('vehicles_master')
      .select('id, make, model, year, size_class, drive, fuel_type, mpg_city, mpg_hwy, engine_displacement, cylinders')
      .range(from, from + pageSize - 1);

    if (fetchError) {
      console.error('❌ Error fetching vehicles:', fetchError);
      process.exit(1);
    }

    if (!vehicles || vehicles.length === 0) {
      hasMore = false;
    } else {
      allVehicles.push(...(vehicles as Vehicle[]));
      from += pageSize;
      console.log(`   Fetched ${allVehicles.length} vehicles so far...`);
      
      // If we got fewer than pageSize, we've reached the end
      if (vehicles.length < pageSize) {
        hasMore = false;
      }
    }
  }

  if (allVehicles.length === 0) {
    console.error('❌ No vehicles found in vehicles_master. Please run importVehicles first.');
    process.exit(1);
  }

  const vehicles = allVehicles;
  console.log(`✅ Found ${vehicles.length} vehicles total\n`);

  // Clear existing listings
  console.log('🗑️  Clearing existing listings...');
  const { error: deleteError } = await supabaseAdmin
    .from('listings')
    .delete()
    .neq('listing_id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) {
    console.warn(`⚠️  Warning clearing listings: ${deleteError.message}`);
  } else {
    console.log('✅ Cleared existing listings\n');
  }

  // Generate listings
  const allListings: Listing[] = [];
  let totalListings = 0;

  console.log('🔄 Generating listings...');
  for (const vehicle of vehicles as Vehicle[]) {
    const count = getListingCount(vehicle);
    totalListings += count;

    for (let i = 0; i < count; i++) {
      const mileage = generateMileage(vehicle);
      const price = calculatePrice(vehicle, mileage);
      const location = generateLocation();
      const features = generateFeatures(vehicle);
      const createdAt = generateCreatedAt();

      allListings.push({
        vehicle_id: vehicle.id,
        price,
        mileage,
        lat: location.lat,
        lon: location.lon,
        features,
        created_at: createdAt,
      });
    }

    if (allListings.length % 1000 === 0) {
      console.log(`   Generated ${allListings.length} listings...`);
    }
  }

  console.log(`✅ Generated ${allListings.length} listings total\n`);

  // Insert in batches
  const BATCH_SIZE = 1000;
  let inserted = 0;
  const startTime = Date.now();

  console.log('💾 Inserting listings into database...');
  for (let i = 0; i < allListings.length; i += BATCH_SIZE) {
    const batch = allListings.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('listings')
      .insert(batch);

    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
    } else {
      inserted += batch.length;
      const progress = ((i + batch.length) / allListings.length * 100).toFixed(1);
      console.log(`📦 Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${inserted}/${allListings.length} (${progress}%)`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Listing generation complete!`);
  console.log(`   Total inserted: ${inserted} listings`);
  console.log(`   Average listings per vehicle: ${(inserted / vehicles.length).toFixed(2)}`);
  console.log(`   Time elapsed: ${elapsed}s`);
}

generateListings().catch(console.error);

