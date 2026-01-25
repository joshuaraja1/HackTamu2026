import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { parseSearchQuery } from '../app/lib/recommend/queryParser';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSearch() {
  console.log('🔍 Debugging "Toyota SUV" search...\n');

  // Step 1: Parse query
  const queryText = 'Toyota SUV';
  const parsedFilters = parseSearchQuery(queryText, {});
  console.log('1. Parsed filters:', JSON.stringify(parsedFilters, null, 2));
  console.log('');

  // Step 2: Find Toyota vehicles
  console.log('2. Finding Toyota vehicles...');
  const { data: toyotaVehicles, error: vehError } = await supabase
    .from('vehicles_master')
    .select('id, make, model, year, size_class')
    .in('make', ['Toyota'])
    .limit(10);
  
  if (vehError) {
    console.error('❌ Error:', vehError);
  } else {
    console.log(`✅ Found ${toyotaVehicles?.length || 0} Toyota vehicles (showing first 10):`);
    toyotaVehicles?.forEach(v => {
      console.log(`   - ${v.year} ${v.make} ${v.model} (${v.size_class})`);
    });
  }
  console.log('');

  // Step 3: Find Toyota vehicles with SUV size_class
  console.log('3. Finding Toyota vehicles with SUV size_class...');
  const { data: toyotaSuvVehicles, error: suvError } = await supabase
    .from('vehicles_master')
    .select('id, make, model, year, size_class')
    .in('make', ['Toyota'])
    .or('size_class.ilike.%sport utility%,size_class.ilike.%suv%')
    .limit(10);
  
  if (suvError) {
    console.error('❌ Error:', suvError);
  } else {
    console.log(`✅ Found ${toyotaSuvVehicles?.length || 0} Toyota SUV vehicles (showing first 10):`);
    toyotaSuvVehicles?.forEach(v => {
      console.log(`   - ${v.year} ${v.make} ${v.model} (${v.size_class})`);
    });
  }
  console.log('');

  // Step 4: Get vehicle IDs
  const { data: allToyotaVehicles } = await supabase
    .from('vehicles_master')
    .select('id')
    .in('make', ['Toyota']);
  
  const vehicleIds = allToyotaVehicles?.map(v => v.id) || [];
  console.log(`4. Found ${vehicleIds.length} total Toyota vehicle IDs`);
  console.log('');

  // Step 5: Find listings for these vehicles
  console.log('5. Finding listings for Toyota vehicles...');
  const { data: listings, error: listError } = await supabase
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
    .in('vehicle_id', vehicleIds.slice(0, 1000)) // Limit to first 1000 for testing
    .limit(10);
  
  if (listError) {
    console.error('❌ Error:', listError);
    console.error('Error details:', JSON.stringify(listError, null, 2));
  } else {
    console.log(`✅ Found ${listings?.length || 0} listings (showing first 10):`);
    listings?.forEach((l: any) => {
      const v = l.vehicles_master;
      const sizeClass = v.size_class || '';
      const isSuv = sizeClass.toLowerCase().includes('sport utility') || 
                    sizeClass.toLowerCase().includes('suv') || 
                    sizeClass.toLowerCase().includes('utility');
      console.log(`   - ${v.year} ${v.make} ${v.model} (${v.size_class}) - SUV: ${isSuv} - $${l.price}`);
    });
  }
  console.log('');

  // Step 6: Test body type mapping
  console.log('6. Testing body type mapping...');
  if (listings && listings.length > 0) {
    listings.forEach((l: any) => {
      const vehicle = l.vehicles_master;
      let bodyType = vehicle.size_class || 'sedan';
      const sizeClassLower = bodyType.toLowerCase();
      if (sizeClassLower.includes('sport utility') || sizeClassLower.includes('suv') || sizeClassLower.includes('utility')) {
        bodyType = 'suv';
      }
      console.log(`   ${vehicle.size_class} -> ${bodyType}`);
    });
  }
}

debugSearch().catch(console.error);

