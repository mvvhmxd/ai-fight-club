import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DATABASE_URL ? undefined : process.env.DB_HOST || 'localhost',
    user: process.env.DATABASE_URL ? undefined : process.env.DB_USER || 'postgres',
    password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD || 'password',
    database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME || 'ai_fight_club',
    ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    const schemaPath = path.join(process.cwd(), 'scripts', 'init-db.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await pool.query(schema);
    console.log('✓ PostgreSQL schema migrated successfully');
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
