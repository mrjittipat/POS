import fs from 'fs';
import path from 'path';
import pool from '../config/database';

/**
 * Database Seed Script
 * รัน SQL seed files เพื่อใส่ข้อมูลเริ่มต้น
 */

async function seed(): Promise<void> {
  const seedsDir = path.join(__dirname, '..', '..', '..', 'database', 'seeds');

  const files = fs.readdirSync(seedsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} seed files`);

  for (const file of files) {
    console.log(`🌱 Seeding: ${file}`);
    const sql = fs.readFileSync(path.join(seedsDir, file), 'utf-8');

    const statements = sql.split(';').filter((s) => s.trim().length > 0);

    for (const statement of statements) {
      try {
        await pool.execute(statement);
      } catch (error) {
        console.error(`❌ Error in ${file}:`, error);
        throw error;
      }
    }

    console.log(`✅ Seeded: ${file}`);
  }

  console.log('🎉 All seeds completed!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
