import { config } from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { parseSearchQuery } from '../app/lib/recommend/queryParser';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugQuery() {
  const query = "Toyota Camry 2020 under 25k AWD";
  console.log(`\n🔍 Testing query: "${query}"\n`);

  // Parse the query
  const filters = parseSearchQuery(query);
  console.log('📋 Extracted filters:', JSON.stringify(filters, null, 2));

  // Check database
  console.log('\n📊 Database check:');
  
  // Count total listings
  const { count: totalListings } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('is_available', true);
  console.log(`Total available listings: ${totalListings}`);

  // Count Toyota vehicles
  const { count: toyotaCount } = await supabase
    .from('vehicles_master')
    .select('*', { count: 'exact', head: true })
    .eq('make', 'Toyota');
  console.log(`Toyota vehicles: ${toyotaCount}`);

  // Find Toyota Camry vehicles
  const { data: camryVehicles, error: camryError } = await supabase
    .from('vehicles_master')
    .select('id, make, model, base_model, year, drive, size_class')
    .eq('make', 'Toyota')
    .ilike('model', '%camry%')
    .gte('year', 2019)
    .lte('year', 2021)
    .limit(10);
  
  console.log(`\n🚗 Toyota Camry 2019-2021 vehicles (first 10):`);
  if (camryError) {
    console.error('Error:', camryError);
  } else {
    console.log(`Found ${camryVehicles?.length || 0} vehicles`);
    camryVehicles?.forEach((v, i) => {
      console.log(`  ${i + 1}. ${v.year} ${v.make} ${v.model} ${v.base_model || ''} - ${v.drive} - ${v.size_class}`);
    });
  }

  // Check for AWD Toyota Camry
  const { data: awdCamry, error: awdError } = await supabase
    .from('vehicles_master')
    .select('id, make, model, base_model, year, drive')
    .eq('make', 'Toyota')
    .ilike('model', '%camry%')
    .gte('year', 2019)
    .lte('year', 2021)
    .or('drive.ilike.%4-wheel%,drive.ilike.%all-wheel%,drive.ilike.%awd%,drive.ilike.%4wd%')
    .limit(10);
  
  console.log(`\n🚗 AWD Toyota Camry 2019-2021 vehicles (first 10):`);
  if (awdError) {
    console.error('Error:', awdError);
  } else {
    console.log(`Found ${awdCamry?.length || 0} vehicles`);
    awdCamry?.forEach((v, i) => {
      console.log(`  ${i + 1}. ${v.year} ${v.make} ${v.model} ${v.base_model || ''} - ${v.drive}`);
    });
  }

  // Check listings for these vehicles
  if (awdCamry && awdCamry.length > 0) {
    const vehicleIds = awdCamry.map(v => v.id);
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('listing_id, vehicle_id, price, mileage, lat, lon')
      .in('vehicle_id', vehicleIds.slice(0, 100))
      .eq('is_available', true)
      .lte('price', 25000)
      .limit(20);
    
    console.log(`\n💰 Listings for AWD Camry under $25k:`);
    if (listingsError) {
      console.error('Error:', listingsError);
    } else {
      console.log(`Found ${listings?.length || 0} listings`);
      listings?.forEach((l, i) => {
        console.log(`  ${i + 1}. Listing ${l.listing_id}: $${l.price}, ${l.mileage} miles`);
      });
    }
  }

  // Check what the actual drive values are for Toyota vehicles
  const { data: driveSamples, error: driveError } = await supabase
    .from('vehicles_master')
    .select('drive')
    .eq('make', 'Toyota')
    .not('drive', 'is', null)
    .limit(100);
  
  console.log(`\n🔧 Sample drive values for Toyota vehicles:`);
  if (driveError) {
    console.error('Error:', driveError);
  } else {
    const uniqueDrives = [...new Set(driveSamples?.map(v => v.drive) || [])];
    console.log(`Unique drive values: ${uniqueDrives.join(', ')}`);
  }
}

debugQuery().catch(console.error);

