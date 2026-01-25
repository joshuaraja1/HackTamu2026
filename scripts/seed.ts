import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../app/lib/supabaseServer';

interface CarData {
  make: string;
  model: string;
  trim?: string;
  year: number;
  body_type: string;
  price_cents: number;
  mileage: number;
  drivetrain?: string;
  fuel_type?: string;
  transmission?: string;
  engine?: string;
  mpg_city?: number;
  mpg_highway?: number;
  seats?: number;
  doors?: number;
  color: string;
  vin: string;
  features?: string[];
  description?: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  seller_name: string;
  seller_phone: string;
}

async function seedCars() {
  const dataPath = path.join(process.cwd(), 'data', 'cars.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error('Cars data file not found. Run "pnpm run synth" first.');
    process.exit(1);
  }

  const carsData: CarData[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`Seeding ${carsData.length} cars...`);

  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < carsData.length; i += batchSize) {
    const batch = carsData.slice(i, i + batchSize);
    const { error } = await supabaseAdmin.from('cars').insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`Inserted batch ${i / batchSize + 1}/${Math.ceil(carsData.length / batchSize)}`);
    }
  }

  console.log('Cars seeded successfully!');
}

async function seedUsers() {
  const dataPath = path.join(process.cwd(), 'data', 'users.json');
  
  if (!fs.existsSync(dataPath)) {
    console.log('Users data file not found. Skipping user seeding.');
    return;
  }

  console.log('Skipping user seeding - users need to be created via Supabase Auth first.');
  console.log('For demo purposes, the app will work without user profiles.');
  console.log('You can create users through Supabase Auth or use the demo user dropdown in the UI.');
}

async function seedInteractions() {
  const dataPath = path.join(process.cwd(), 'data', 'interactions.json');
  
  if (!fs.existsSync(dataPath)) {
    console.log('Interactions data file not found. Skipping interaction seeding.');
    return;
  }

  const interactionsData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`Seeding ${interactionsData.length} interactions...`);

  // Get all car IDs from database and create a mapping
  const { data: cars, error: carsError } = await supabaseAdmin
    .from('cars')
    .select('id')
    .order('created_at', { ascending: true });

  if (carsError || !cars) {
    console.error('Error fetching cars for mapping:', carsError);
    return;
  }

  // Create mapping: synthetic index -> actual UUID
  const carIdMap = new Map<string, string>();
  cars.forEach((car, index) => {
    const syntheticId = `car-${index + 1}`;
    carIdMap.set(syntheticId, car.id);
  });

  // Map interactions to use real UUIDs
  const mappedInteractions = interactionsData
    .map((interaction: any) => {
      const realCarId = carIdMap.get(interaction.car_id);
      if (!realCarId) return null; // Skip if car not found
      
      return {
        ...interaction,
        car_id: realCarId,
        // Skip user_id for now since we don't have auth users
        // user_id: interaction.user_id,
      };
    })
    .filter(Boolean)
    .slice(0, 10000); // Limit to 10k for demo

  console.log(`Mapped ${mappedInteractions.length} interactions to real car IDs...`);

  // Insert in batches
  const batchSize = 500;
  for (let i = 0; i < mappedInteractions.length; i += batchSize) {
    const batch = mappedInteractions.slice(i, i + batchSize);
    const { error } = await supabaseAdmin.from('interactions').insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`Inserted batch ${i / batchSize + 1}/${Math.ceil(mappedInteractions.length / batchSize)}`);
    }
  }

  console.log('Interactions seeded successfully!');
}

async function main() {
  console.log('Starting database seeding...');

  try {
    await seedCars();
    await seedUsers();
    await seedInteractions();
    console.log('Database seeding completed!');
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

main();

