
import { db } from '../config/database';

async function run() {
  try {
    const dbCheck = await db.query('SELECT current_database()');
    console.log('Connected to database:', dbCheck.rows[0].current_database);

    await db.query(`ALTER TABLE worker_heartbeat ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT false`);
    console.log('✅ is_paused column added (or already existed)');

    await db.query(`ALTER TABLE worker_heartbeat ADD COLUMN IF NOT EXISTS paused_by UUID REFERENCES users(id) ON DELETE SET NULL`);
    console.log('✅ paused_by column added (or already existed)');

    await db.query(`ALTER TABLE worker_heartbeat ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP`);
    console.log('✅ paused_at column added (or already existed)');

    const check = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'worker_heartbeat' ORDER BY column_name`
    );
    console.log('\nFinal columns on worker_heartbeat:');
    check.rows.forEach((r: { column_name: string }) => console.log('  -', r.column_name));

    console.log('\n✅ Migration complete. Restart your backend and Pause/Resume Queue should work.');
  } catch (err: any) {
    console.error('\n❌ Migration failed:', err.message);
  } finally {
    process.exit(0);
  }
}

run();