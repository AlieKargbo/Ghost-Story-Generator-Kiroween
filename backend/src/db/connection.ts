import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(poolConfig);
    
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
    
    pool.on('connect', () => {
      console.log('Database connection established');
    });
  }
  
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connection pool closed');
  }
}
