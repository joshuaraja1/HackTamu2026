import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { join } from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';
import { supabaseAdmin } from '../app/lib/supabaseAdmin';

interface VehicleRow {
  Make?: string;
  Model?: string;
  baseModel?: string;
  Year?: string;
  Drive?: string;
  Transmission?: string;
  'Fuel Type1'?: string;
  'Fuel Type'?: string;
  'City Mpg For Fuel Type1'?: string;
  'Highway Mpg For Fuel Type1'?: string;
  Cylinders?: string;
  'Engine displacement'?: string;
  'Vehicle Size Class'?: string;
  ID?: string;
  [key: string]: string | undefined;
}

interface VehicleRecord {
  make: string;
  model: string;
  base_model: string | null;
  year: number;
  drive: string | null;
  transmission: string | null;
  fuel_type: string | null;
  mpg_city: number | null;
  mpg_hwy: number | null;
  cylinders: number | null;
  engine_displacement: number | null;
  size_class: string | null;
  search_text: string;
  source_row_id: string | null;
}

function parseFloatSafe(value: string | undefined): number | null {
  if (!value || value.trim() === '' || value === '0.0' || value === '-1') return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

function parseIntSafe(value: string | undefined): number | null {
  if (!value || value.trim() === '' || value === '0' || value === '-1') return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

function buildSearchText(record: VehicleRecord): string {
  const parts = [
    record.year.toString(),
    record.make,
    record.model,
    record.base_model || '',
    record.size_class || '',
    record.drive || '',
    record.transmission || '',
    record.fuel_type || '',
    `mpg_city:${record.mpg_city || ''}`,
    `mpg_hwy:${record.mpg_hwy || ''}`,
    `engine:${record.engine_displacement || ''}`,
    `cylinders:${record.cylinders || ''}`,
  ];
  return parts.filter(p => p).join(' ');
}

function createDedupKey(record: VehicleRecord): string {
  return [
    record.make.toLowerCase(),
    record.model.toLowerCase(),
    record.year.toString(),
    (record.drive || '').toLowerCase(),
    (record.transmission || '').toLowerCase(),
    (record.fuel_type || '').toLowerCase(),
    (record.engine_displacement || '').toString(),
    (record.cylinders || '').toString(),
    (record.size_class || '').toLowerCase(),
    (record.base_model || '').toLowerCase(),
  ].join('|');
}

async function importVehicles() {
  console.log('🚗 Starting vehicle import...\n');

  const csvPath = join(process.cwd(), 'all-vehicles-model.csv');
  console.log(`Reading CSV from: ${csvPath}`);

  let fileContent: string;
  try {
    fileContent = readFileSync(csvPath, 'utf-8');
  } catch (error) {
    console.error(`❌ Error reading CSV file: ${error}`);
    process.exit(1);
  }

  // Remove BOM if present
  if (fileContent.charCodeAt(0) === 0xfeff) {
    fileContent = fileContent.slice(1);
  }

  // Parse CSV
  const records: VehicleRow[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';',
    relax_column_count: true,
    trim: true,
  });

  console.log(`📊 Parsed ${records.length} rows from CSV\n`);

  // Process and deduplicate
  const seen = new Set<string>();
  const vehicles: VehicleRecord[] = [];
  let skipped = 0;

  for (const row of records) {
    const make = row.Make?.trim();
    const model = row.Model?.trim();
    const yearStr = row.Year?.trim();

    if (!make || !model || !yearStr) {
      skipped++;
      continue;
    }

    const year = parseIntSafe(yearStr);
    if (!year || year < 1900 || year > new Date().getFullYear() + 1) {
      skipped++;
      continue;
    }

    const vehicle: VehicleRecord = {
      make,
      model,
      base_model: row.baseModel?.trim() || null,
      year,
      drive: row.Drive?.trim() || null,
      transmission: row.Transmission?.trim() || null,
      fuel_type: (row['Fuel Type1'] || row['Fuel Type'])?.trim() || null,
      mpg_city: parseFloatSafe(row['City Mpg For Fuel Type1']),
      mpg_hwy: parseFloatSafe(row['Highway Mpg For Fuel Type1']),
      cylinders: parseIntSafe(row.Cylinders),
      engine_displacement: parseFloatSafe(row['Engine displacement']),
      size_class: row['Vehicle Size Class']?.trim() || null,
      source_row_id: row.ID?.trim() || null,
      search_text: '', // Will be set below
    };

    vehicle.search_text = buildSearchText(vehicle);
    const dedupKey = createDedupKey(vehicle);

    if (!seen.has(dedupKey)) {
      seen.add(dedupKey);
      vehicles.push(vehicle);
    } else {
      skipped++;
    }
  }

  console.log(`✅ Processed ${vehicles.length} unique vehicles (skipped ${skipped} duplicates/invalid)\n`);

  // Clear existing data (optional - comment out if you want to append)
  console.log('🗑️  Clearing existing vehicles_master data...');
  const { error: deleteError } = await supabaseAdmin
    .from('vehicles_master')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.warn(`⚠️  Warning clearing data: ${deleteError.message}`);
  } else {
    console.log('✅ Cleared existing data\n');
  }

  // Insert in batches
  const BATCH_SIZE = 1000;
  let inserted = 0;
  const startTime = Date.now();

  for (let i = 0; i < vehicles.length; i += BATCH_SIZE) {
    const batch = vehicles.slice(i, i + BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from('vehicles_master')
      .insert(batch);

    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
      // Continue with next batch
    } else {
      inserted += batch.length;
      const progress = ((i + batch.length) / vehicles.length * 100).toFixed(1);
      console.log(`📦 Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${inserted}/${vehicles.length} (${progress}%)`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Import complete!`);
  console.log(`   Total inserted: ${inserted} vehicles`);
  console.log(`   Time elapsed: ${elapsed}s`);
}

importVehicles().catch(console.error);

