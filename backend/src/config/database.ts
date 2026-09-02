import mysql from 'mysql2/promise';
import { env } from './env';

const connectionConfig = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  charset: 'utf8mb4',
  timezone: '+07:00',
};

// Create MySQL connection pool with UTF-8 support
const pool = mysql.createPool({
  ...connectionConfig,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
});

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const isMissingDatabase = message.includes('Unknown database') || message.includes('ER_BAD_DB_ERROR');

    if (isMissingDatabase) {
      try {
        const adminConnection = await mysql.createConnection(connectionConfig);
        const escapedDbName = env.DB_NAME.replace(/`/g, '``');
        await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${escapedDbName}\``);
        await adminConnection.end();

        const retryConnection = await pool.getConnection();
        await retryConnection.query('SELECT 1');
        retryConnection.release();

        console.log(`✅ Database "${env.DB_NAME}" created and connected successfully`);
        return true;
      } catch (createError) {
        console.error(`❌ Failed to create database "${env.DB_NAME}":`, createError);
        return false;
      }
    }

    console.error('❌ Database connection failed:', error);
    return false;
  }
}

export default pool;
