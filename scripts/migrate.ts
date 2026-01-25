import * as fs from 'fs';
import * as path from 'path';
import { supabaseAdmin } from '../app/lib/supabaseServer';

async function runMigration(filePath: string) {
  const sql = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  
  console.log(`\nRunning migration: ${fileName}...`);
  
  // Split by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    if (statement.trim()) {
      try {
        const { error } = await supabaseAdmin.rpc('exec_sql', { sql: statement });
        if (error) {
          // Try direct query instead
          const { error: queryError } = await supabaseAdmin.from('_migrations').select('*').limit(1);
          // If that fails, try executing via raw SQL
          console.warn(`Note: Some statements may need to be run manually in SQL Editor`);
        }
      } catch (err) {
        // Ignore - will need manual execution
      }
    }
  }
  
  console.log(`✓ ${fileName} processed`);
}

async function main() {
  console.log('Setting up database migrations...');
  console.log('\n⚠️  IMPORTANT: Supabase requires running SQL migrations in the SQL Editor.');
  console.log('Please follow these steps:\n');
  
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const files = ['001_init.sql', '002_rls.sql', '003_match_function.sql'];
  
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`\n📄 ${file}:`);
      console.log('─'.repeat(50));
      const content = fs.readFileSync(filePath, 'utf-8');
      console.log(content);
      console.log('─'.repeat(50));
    }
  }
  
  console.log('\n\n📋 INSTRUCTIONS:');
  console.log('1. Go to your Supabase Dashboard → SQL Editor');
  console.log('2. Copy and paste each migration file above (in order)');
  console.log('3. Click "Run" for each one');
  console.log('4. Then run: npm run seed && npm run embed');
}

main().catch(console.error);

