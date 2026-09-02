import pool from '../config/database';

async function runMigration() {
  try {
    console.log('Running migration: Remove UNIQUE constraints from sku and barcode...');

    // Drop existing unique indexes
    await pool.execute('ALTER TABLE products DROP INDEX sku');
    console.log('✓ Dropped UNIQUE constraint on sku');

    await pool.execute('ALTER TABLE products DROP INDEX barcode');
    console.log('✓ Dropped UNIQUE constraint on barcode');

    // Add non-unique indexes
    await pool.execute('ALTER TABLE products ADD INDEX idx_sku_lookup (sku)');
    console.log('✓ Added non-unique index on sku');

    await pool.execute('ALTER TABLE products ADD INDEX idx_barcode_lookup (barcode)');
    console.log('✓ Added non-unique index on barcode');

    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
