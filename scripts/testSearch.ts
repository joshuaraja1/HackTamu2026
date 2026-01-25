import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { parseSearchQuery } from '../app/lib/recommend/queryParser';
import { recommendCars } from '../app/lib/recommend/pipeline';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

async function testSearch() {
  console.log('🔍 Testing "Toyota SUV" search...\n');

  // Parse the query
  const queryText = 'Toyota SUV';
  const parsedFilters = parseSearchQuery(queryText, {});
  console.log('Parsed filters:', JSON.stringify(parsedFilters, null, 2));
  console.log('');

  // Run the recommendation
  try {
    console.log('Running recommendCars...');
    const result = await recommendCars(undefined, {
      ...parsedFilters,
      queryText,
    });

    console.log('\n✅ Search completed!');
    console.log(`Found ${result.results.length} results`);
    console.log(`Final stage: ${result.debug?.final_stage}`);
    console.log(`Stage counts:`, result.debug?.stage_counts);
    
    if (result.results.length > 0) {
      console.log('\nFirst 5 results:');
      result.results.slice(0, 5).forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.car.year} ${r.car.make} ${r.car.model} (${r.car.body_type}) - $${r.car.price_cents / 100}`);
      });
    } else {
      console.log('\n❌ No results found!');
      if (result.debug?.top_signals) {
        console.log('Error signals:', result.debug.top_signals);
      }
    }
  } catch (error: any) {
    console.error('\n❌ Error during search:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
  }
}

testSearch().catch(console.error);

