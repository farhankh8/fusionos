/**
 * FusionOS database seed script.
 *
 * This script will be expanded in Phase 2 to seed initial data.
 * Currently a placeholder — no business data to seed in Phase 1.
 */

async function main() {
  console.log('🌱 Database seed: no business tables to seed yet.');
  console.log('   Phase 2 will populate initial data.');
}

main()
  .then(() => {
    console.log('✅ Seed complete.');
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
