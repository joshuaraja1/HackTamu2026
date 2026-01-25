import { supabaseAdmin } from '../app/lib/supabaseAdmin';

interface DemoUser {
  name: string;
  home_lat: number;
  home_lon: number;
  preferred_budget: number;
  preferred_makes: string[];
  preferred_size_classes: string[];
}

interface Listing {
  listing_id: string;
  vehicle_id: string;
  price: number;
  lat: number;
  lon: number;
}

interface Vehicle {
  id: string;
  make: string;
  size_class: string | null;
}

const METROS = [
  { name: 'Dallas', lat: 32.7767, lon: -96.7970 },
  { name: 'Austin', lat: 30.2672, lon: -97.7431 },
  { name: 'Houston', lat: 29.7604, lon: -95.3698 },
  { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  { name: 'NYC', lat: 40.7128, lon: -74.0060 },
  { name: 'Chicago', lat: 41.8781, lon: -87.6298 },
];

const MAKES = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'BMW', 'Mercedes', 'Audi', 'Hyundai', 'Kia'];
const SIZE_CLASSES = [
  'Compact Cars',
  'Midsize Cars',
  'Large Cars',
  'Small Sport Utility Vehicle 2WD',
  'Standard Sport Utility Vehicle 2WD',
  'Small Pickup Trucks 2WD',
];

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function generateDemoUser(index: number): DemoUser {
  const metro = METROS[index % METROS.length];
  const jitter = 0.1;
  
  // Budget: 15k - 60k with some variation
  const budget = 15000 + Math.random() * 45000;
  
  // Preferred makes: 1-3 makes
  const numMakes = 1 + Math.floor(Math.random() * 3);
  const shuffled = [...MAKES].sort(() => Math.random() - 0.5);
  const preferred_makes = shuffled.slice(0, numMakes);
  
  // Preferred size classes: 1-2
  const numSizes = 1 + Math.floor(Math.random() * 2);
  const shuffledSizes = [...SIZE_CLASSES].sort(() => Math.random() - 0.5);
  const preferred_size_classes = shuffledSizes.slice(0, numSizes);

  return {
    name: `Demo User ${index + 1}`,
    home_lat: metro.lat + (Math.random() - 0.5) * jitter,
    home_lon: metro.lon + (Math.random() - 0.5) * jitter,
    preferred_budget: Math.round(budget),
    preferred_makes,
    preferred_size_classes,
  };
}

async function seedDemoUsers() {
  console.log('👥 Starting demo user and interaction seeding...\n');

  // Clear existing data
  console.log('🗑️  Clearing existing demo data...');
  await supabaseAdmin.from('interactions_demo').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('demo_users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✅ Cleared existing demo data\n');

  // Generate 300 demo users
  console.log('👤 Creating 300 demo users...');
  const demoUsers: DemoUser[] = [];
  for (let i = 0; i < 300; i++) {
    demoUsers.push(generateDemoUser(i));
  }

  const { data: insertedUsers, error: userError } = await supabaseAdmin
    .from('demo_users')
    .insert(demoUsers)
    .select('id');

  if (userError) {
    console.error('❌ Error inserting demo users:', userError);
    process.exit(1);
  }

  console.log(`✅ Created ${insertedUsers?.length || 0} demo users\n`);

  // Fetch vehicles and listings using pagination
  console.log('📥 Fetching vehicles and listings...');
  
  // Fetch all vehicles
  const allVehicles: Vehicle[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data: vehicles, error } = await supabaseAdmin
      .from('vehicles_master')
      .select('id, make, size_class')
      .range(from, from + pageSize - 1);
    
    if (error) {
      console.error('❌ Error fetching vehicles:', error);
      process.exit(1);
    }
    
    if (!vehicles || vehicles.length === 0) {
      hasMore = false;
    } else {
      allVehicles.push(...(vehicles as Vehicle[]));
      from += pageSize;
      if (vehicles.length < pageSize) hasMore = false;
    }
  }
  
  const vehicles = allVehicles;
  
  // Fetch all listings
  const allListings: Listing[] = [];
  from = 0;
  hasMore = true;
  
  while (hasMore) {
    const { data: listings, error } = await supabaseAdmin
      .from('listings')
      .select('listing_id, vehicle_id, price, lat, lon')
      .range(from, from + pageSize - 1);
    
    if (error) {
      console.error('❌ Error fetching listings:', error);
      process.exit(1);
    }
    
    if (!listings || listings.length === 0) {
      hasMore = false;
    } else {
      allListings.push(...(listings as Listing[]));
      from += pageSize;
      if (listings.length < pageSize) hasMore = false;
    }
  }
  
  const listings = allListings;

  if (!vehicles || !listings) {
    console.error('❌ Error fetching vehicles or listings');
    process.exit(1);
  }

  console.log(`✅ Found ${vehicles.length} vehicles and ${listings.length} listings\n`);

  // Create vehicle lookup
  const vehicleMap = new Map<string, Vehicle>();
  for (const v of vehicles) {
    vehicleMap.set(v.id, v);
  }

  // Generate 25k interactions
  console.log('🔄 Generating 25,000 interactions...');
  const interactions: Array<{
    user_id: string;
    listing_id: string;
    event_type: 'view' | 'favorite' | 'purchase';
    created_at: string;
  }> = [];

  const eventWeights = { view: 0.8, favorite: 0.15, purchase: 0.05 };
  const eventTypes: ('view' | 'favorite' | 'purchase')[] = [];
  for (const [type, weight] of Object.entries(eventWeights)) {
    for (let i = 0; i < weight * 100; i++) {
      eventTypes.push(type as 'view' | 'favorite' | 'purchase');
    }
  }

  for (let i = 0; i < 25000; i++) {
    const user = insertedUsers![Math.floor(Math.random() * insertedUsers!.length)];
    const listing = listings[Math.floor(Math.random() * listings.length)] as Listing;
    const vehicle = vehicleMap.get(listing.vehicle_id);

    // Bias: users prefer listings matching their preferences
    const userData = demoUsers.find(u => u.name === `Demo User ${insertedUsers!.indexOf(user) + 1}`);
    if (userData && vehicle) {
      const matchesMake = userData.preferred_makes.some(m => vehicle.make.toUpperCase().includes(m.toUpperCase()));
      const matchesSize = userData.preferred_size_classes.some(s => vehicle.size_class?.includes(s) || false);
      const matchesBudget = listing.price <= userData.preferred_budget * 1.2; // 20% over budget is okay
      const distance = calculateDistance(userData.home_lat, userData.home_lon, listing.lat, listing.lon);
      const matchesLocation = distance < 50; // Within 50 miles

      // If matches preferences, higher chance of interaction
      if (matchesMake && matchesSize && matchesBudget && matchesLocation && Math.random() < 0.7) {
        // Use this interaction
      } else if (Math.random() < 0.3) {
        // 30% chance even if doesn't match
      } else {
        // Skip this interaction, try another listing
        i--;
        continue;
      }
    }

    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const daysAgo = Math.floor(Math.random() * 90);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    interactions.push({
      user_id: user.id,
      listing_id: listing.listing_id,
      event_type: eventType,
      created_at: createdAt.toISOString(),
    });

    if (interactions.length % 5000 === 0) {
      console.log(`   Generated ${interactions.length} interactions...`);
    }
  }

  console.log(`✅ Generated ${interactions.length} interactions\n`);

  // Insert interactions in batches
  const BATCH_SIZE = 1000;
  let inserted = 0;
  const startTime = Date.now();

  console.log('💾 Inserting interactions...');
  for (let i = 0; i < interactions.length; i += BATCH_SIZE) {
    const batch = interactions.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('interactions_demo')
      .insert(batch);

    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
    } else {
      inserted += batch.length;
      const progress = ((i + batch.length) / interactions.length * 100).toFixed(1);
      console.log(`📦 Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${inserted}/${interactions.length} (${progress}%)`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Demo seeding complete!`);
  console.log(`   Users: ${insertedUsers?.length || 0}`);
  console.log(`   Interactions: ${inserted}`);
  console.log(`   Time elapsed: ${elapsed}s`);
}

seedDemoUsers().catch(console.error);

