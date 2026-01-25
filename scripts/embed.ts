import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../app/lib/supabaseServer';
import { generateCarEmbedding } from '../app/lib/recommend/embeddings';
import type { Car } from '../app/lib/recommend/types';

async function embedCars() {
  console.log('Fetching cars without embeddings...');

  const { data: cars, error: fetchError } = await supabaseAdmin
    .from('cars')
    .select('*')
    .is('embedding', null)
    .limit(1000);

  if (fetchError) {
    console.error('Error fetching cars:', fetchError);
    return;
  }

  if (!cars || cars.length === 0) {
    console.log('All cars already have embeddings.');
    return;
  }

  console.log(`Generating embeddings for ${cars.length} cars...`);

  for (let i = 0; i < cars.length; i++) {
    const car = cars[i] as Car;
    
    try {
      const embedding = await generateCarEmbedding(car);
      
      // Convert to PostgreSQL vector format: '[1,2,3]'
      const embeddingVector = `[${embedding.join(',')}]`;
      
      const { error: updateError } = await supabaseAdmin
        .from('cars')
        .update({ embedding: embeddingVector })
        .eq('id', car.id);

      if (updateError) {
        console.error(`Error updating car ${car.id}:`, updateError);
      } else {
        if ((i + 1) % 10 === 0) {
          console.log(`Processed ${i + 1}/${cars.length} cars...`);
        }
      }
    } catch (error) {
      console.error(`Error generating embedding for car ${car.id}:`, error);
    }
  }

  console.log('Embedding generation completed!');
}

async function main() {
  console.log('Starting embedding generation...');
  console.log('This may take a while. Using fallback hashed embeddings if transformers fail.');
  
  await embedCars();
  
  // Check if there are more cars to process
  const { count } = await supabaseAdmin
    .from('cars')
    .select('*', { count: 'exact', head: true })
    .is('embedding', null);

  if (count && count > 0) {
    console.log(`\n${count} cars still need embeddings. Run this script again to process more.`);
  } else {
    console.log('\nAll cars have embeddings!');
  }
}

main().catch(console.error);

