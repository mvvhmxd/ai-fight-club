import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
  });

  try {
    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'ai_fight_club'}\``);
    console.log('✓ Database created or already exists');

    // Use the database
    await connection.query(`USE \`${process.env.DB_NAME || 'ai_fight_club'}\``);

    // Read and execute schema
    const schemaPath = path.join(process.cwd(), 'scripts', 'init-db.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Split by semicolon and execute each statement
    const statements = schema.split(';').filter(s => s.trim());
    for (const statement of statements) {
      await connection.query(statement);
    }

    // Bring databases created by earlier versions forward to the assignment-first review model.
    await connection.query('ALTER TABLE `review` MODIFY `feedback` LONGTEXT NULL');
    await connection.query("ALTER TABLE `review` MODIFY `decision` ENUM('approve', 'changes_requested', 'reject') NULL");
    await connection.query('ALTER TABLE `review` MODIFY `reviewed_at` TIMESTAMP NULL');

    console.log('✓ Database schema created successfully');
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigrations();
