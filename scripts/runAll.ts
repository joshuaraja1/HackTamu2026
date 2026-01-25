import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runScript(script: string, description: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 ${description}`);
  console.log('='.repeat(60));
  
  try {
    const { stdout, stderr } = await execAsync(`tsx scripts/${script}`);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error: any) {
    console.error(`❌ Error running ${script}:`, error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    throw error;
  }
}

async function runAll() {
  console.log('🎯 Starting complete data ingestion pipeline...\n');

  try {
    // Step 1: Import vehicles
    await runScript('importVehicles.ts', 'Step 1: Importing vehicles from CSV');

    // Step 2: Generate listings
    await runScript('generateListings.ts', 'Step 2: Generating synthetic listings');

    // Step 3: Seed demo users (optional)
    console.log('\n' + '='.repeat(60));
    console.log('📊 Step 3: Seeding demo users and interactions (optional)');
    console.log('='.repeat(60));
    try {
      await runScript('seedDemoUsers.ts', 'Step 3: Seeding demo users and interactions');
    } catch (error) {
      console.warn('⚠️  Demo user seeding failed or skipped (this is okay)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All steps completed successfully!');
    console.log('='.repeat(60));
    console.log('\n📊 Next steps:');
    console.log('   1. Verify data in Supabase dashboard');
    console.log('   2. Check row counts:');
    console.log('      - vehicles_master: should have tens of thousands');
    console.log('      - listings: should have 1-5 per vehicle');
    console.log('      - demo_users: 300 users');
    console.log('      - interactions_demo: 25,000 interactions');
    console.log('   3. Run your application and test search functionality\n');
  } catch (error) {
    console.error('\n❌ Pipeline failed. Please check the errors above.');
    process.exit(1);
  }
}

runAll();

