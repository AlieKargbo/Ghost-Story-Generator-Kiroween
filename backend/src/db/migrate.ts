import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as migration001 from './migrations/001_initial_schema.js';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Run migration 001
    await migration001.up(pool);
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function rollbackMigrations() {
  try {
    console.log('Rolling back database migrations...');
    
    // Rollback migration 001
    await migration001.down(pool);
    
    console.log('All migrations rolled back successfully');
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// CLI handling
const command = process.argv[2];

if (command === 'up') {
  runMigrations();
} else if (command === 'down') {
  rollbackMigrations();
} else {
  console.log('Usage: npm run migrate [up|down]');
  process.exit(1);
}
