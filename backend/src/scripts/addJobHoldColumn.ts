
import { db } from '../config/database';

async function run() {
  try {
    const dbCheck = await db.query('SELECT current_database()');
    console.log('Connected to database:', dbCheck.rows[0].current_database);

    await db.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_held BOOLEAN NOT NULL DEFAULT false`);
    console.log('✅ is_held column added (or already existed) on jobs table');

    console.log('\n✅ Migration complete. Restart your backend and per-job Hold/Release should work.');
  } catch (err: any) {
    console.error('\n❌ Migration failed:', err.message);
  } finally {
    process.exit(0);
  }
}

run();