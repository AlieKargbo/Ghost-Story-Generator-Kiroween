import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function up(pool: Pool): Promise<void> {
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await pool.query(schema);
  console.log('Migration 001_initial_schema: UP completed');
}

export async function down(pool: Pool): Promise<void> {
  await pool.query(`
    DROP TABLE IF EXISTS participants CASCADE;
    DROP TABLE IF EXISTS segments CASCADE;
    DROP TABLE IF EXISTS sessions CASCADE;
  `);
  console.log('Migration 001_initial_schema: DOWN completed');
}
