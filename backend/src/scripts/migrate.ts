import fs from 'fs';
import path from 'path';
import pool from '../config/database';

/**
 * Database Migration Script
 * รัน SQL migration files ตามลำดับ
 */

async function migrate(): Promise<void> {
  const migrationsDir = path.join(__dirname, '..', '..', '..', 'database', 'migrations');

  // Create migrations tracking table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get executed migrations
  const [executed] = await pool.execute('SELECT filename FROM _migrations');
  const executedFiles = new Set((executed as { filename: string }[]).map((r) => r.filename));

  // Read migration files
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files`);

  for (const file of files) {
    if (executedFiles.has(file)) {
      console.log(`⏭️  Skipping (already executed): ${file}`);
      continue;
    }

    console.log(`🔄 Executing: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    // Split by semicolons and execute each statement
    const statements = sql.split(';').filter((s) => s.trim().length > 0);

    for (const statement of statements) {
      try {
        await pool.execute(statement);
      } catch (error) {
        console.error(`❌ Error in ${file}:`, error);
        throw error;
      }
    }

    // Record migration
    await pool.execute('INSERT INTO _migrations (filename) VALUES (?)', [file]);
    console.log(`✅ Completed: ${file}`);
  }

  console.log('🎉 All migrations completed!');
  process.exit(0);
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
