import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('🔍 Testing database connection...\n');

  // Test 1: Count listings
  console.log('1. Counting listings...');
  const { count: listingCount, error: listingError } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('is_available', true);
  
  if (listingError) {
    console.error('❌ Error counting listings:', listingError);
  } else {
    console.log(`✅ Found ${listingCount} available listings\n`);
  }

  // Test 2: Count vehicles
  console.log('2. Counting vehicles...');
  const { count: vehicleCount, error: vehicleError } = await supabase
    .from('vehicles_master')
    .select('*', { count: 'exact', head: true });
  
  if (vehicleError) {
    console.error('❌ Error counting vehicles:', vehicleError);
  } else {
    console.log(`✅ Found ${vehicleCount} vehicles\n`);
  }

  // Test 3: Find Toyota vehicles
  console.log('3. Finding Toyota vehicles...');
  const { data: toyotaVehicles, error: toyotaError } = await supabase
    .from('vehicles_master')
    .select('id, make, model, year, size_class')
    .ilike('make', '%toyota%')
    .limit(5);
  
  if (toyotaError) {
    console.error('❌ Error finding Toyota vehicles:', toyotaError);
  } else {
    console.log(`✅ Found ${toyotaVehicles?.length || 0} Toyota vehicles (showing first 5):`);
    toyotaVehicles?.forEach(v => {
      console.log(`   - ${v.year} ${v.make} ${v.model} (${v.size_class})`);
    });
    console.log('');
  }

  // Test 4: Find listings with Toyota vehicles
  console.log('4. Finding listings with Toyota vehicles...');
  const { data: toyotaListings, error: listingError2 } = await supabase
    .from('listings')
    .select(`
      listing_id,
      vehicle_id,
      price,
      mileage,
      lat,
      lon,
      vehicles_master!inner (
        id,
        make,
        model,
        year,
        size_class
      )
    `)
    .eq('is_available', true)
    .ilike('vehicles_master.make', '%toyota%')
    .limit(5);
  
  if (listingError2) {
    console.error('❌ Error finding Toyota listings:', listingError2);
    console.error('Error details:', JSON.stringify(listingError2, null, 2));
  } else {
    console.log(`✅ Found ${toyotaListings?.length || 0} Toyota listings (showing first 5):`);
    toyotaListings?.forEach((l: any) => {
      const v = l.vehicles_master;
      console.log(`   - ${v.year} ${v.make} ${v.model} (${v.size_class}) - $${l.price} - ${l.mileage}mi`);
    });
    console.log('');
  }

  // Test 5: Check for SUVs
  console.log('5. Finding SUV vehicles...');
  const { data: suvVehicles, error: suvError } = await supabase
    .from('vehicles_master')
    .select('id, make, model, year, size_class')
    .ilike('size_class', '%sport utility%')
    .limit(5);
  
  if (suvError) {
    console.error('❌ Error finding SUV vehicles:', suvError);
  } else {
    console.log(`✅ Found ${suvVehicles?.length || 0} SUV vehicles (showing first 5):`);
    suvVehicles?.forEach(v => {
      console.log(`   - ${v.year} ${v.make} ${v.model} (${v.size_class})`);
    });
    console.log('');
  }

  // Test 6: Find Toyota SUVs
  console.log('6. Finding Toyota SUV listings...');
  const { data: toyotaSuvListings, error: toyotaSuvError } = await supabase
    .from('listings')
    .select(`
      listing_id,
      vehicle_id,
      price,
      mileage,
      lat,
      lon,
      vehicles_master!inner (
        id,
        make,
        model,
        year,
        size_class
      )
    `)
    .eq('is_available', true)
    .ilike('vehicles_master.make', '%toyota%')
    .ilike('vehicles_master.size_class', '%sport utility%')
    .limit(5);
  
  if (toyotaSuvError) {
    console.error('❌ Error finding Toyota SUV listings:', toyotaSuvError);
    console.error('Error details:', JSON.stringify(toyotaSuvError, null, 2));
  } else {
    console.log(`✅ Found ${toyotaSuvListings?.length || 0} Toyota SUV listings (showing first 5):`);
    toyotaSuvListings?.forEach((l: any) => {
      const v = l.vehicles_master;
      console.log(`   - ${v.year} ${v.make} ${v.model} (${v.size_class}) - $${l.price} - ${l.mileage}mi`);
    });
    console.log('');
  }

  console.log('✅ Database test complete!');
}

testDatabase().catch(console.error);

