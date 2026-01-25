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

async function testQuery() {
  console.log('🔍 Testing exact query logic...\n');

  // Test 1: Find vehicles with make filter using .or() with ilike
  console.log('1. Testing make filter with .or() and ilike...');
  const { data: vehicles1, error: error1 } = await supabase
    .from('vehicles_master')
    .select('id, make, model, year, size_class')
    .or('make.ilike.%Toyota%')
    .limit(5);
  
  if (error1) {
    console.error('❌ Error with .or() and ilike:', error1);
  } else {
    console.log(`✅ Found ${vehicles1?.length || 0} vehicles`);
    vehicles1?.forEach(v => console.log(`   - ${v.make} ${v.model}`));
  }
  console.log('');

  // Test 2: Find vehicles with make filter using .in() with exact match
  console.log('2. Testing make filter with .in() and exact match...');
  const { data: vehicles2, error: error2 } = await supabase
    .from('vehicles_master')
    .select('id, make, model, year, size_class')
    .in('make', ['Toyota'])
    .limit(5);
  
  if (error2) {
    console.error('❌ Error with .in() and exact match:', error2);
  } else {
    console.log(`✅ Found ${vehicles2?.length || 0} vehicles`);
    vehicles2?.forEach(v => console.log(`   - ${v.make} ${v.model}`));
  }
  console.log('');

  // Test 3: Find listings with Toyota vehicles using join
  console.log('3. Testing listings join with Toyota filter...');
  const { data: listings, error: error3 } = await supabase
    .from('listings')
    .select(`
      listing_id,
      vehicle_id,
      price,
      mileage,
      vehicles_master!inner (
        id,
        make,
        model,
        year,
        size_class
      )
    `)
    .eq('is_available', true)
    .in('vehicles_master.make', ['Toyota'])
    .limit(5);
  
  if (error3) {
    console.error('❌ Error with listings join:', error3);
    console.error('Error details:', JSON.stringify(error3, null, 2));
  } else {
    console.log(`✅ Found ${listings?.length || 0} listings`);
    listings?.forEach((l: any) => {
      const v = l.vehicles_master;
      console.log(`   - ${v.year} ${v.make} ${v.model} - $${l.price}`);
    });
  }
  console.log('');

  // Test 4: Try filtering by size_class for SUVs
  console.log('4. Testing size_class filter for SUVs...');
  const { data: suvVehicles, error: error4 } = await supabase
    .from('vehicles_master')
    .select('id, make, model, year, size_class')
    .or('size_class.ilike.%sport utility%,size_class.ilike.%suv%')
    .in('make', ['Toyota'])
    .limit(5);
  
  if (error4) {
    console.error('❌ Error with size_class filter:', error4);
  } else {
    console.log(`✅ Found ${suvVehicles?.length || 0} Toyota SUV vehicles`);
    suvVehicles?.forEach(v => console.log(`   - ${v.make} ${v.model} (${v.size_class})`));
  }
}

testQuery().catch(console.error);

