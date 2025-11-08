require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.PGUSER || 'dbmsproj',
        host: process.env.PGHOST || 'localhost',
        database: process.env.PGDATABASE || 'student_resource_system',
        password: process.env.PGPASSWORD || '12345678',
        port: Number(process.env.PGPORT) || 5432,
      }
);

async function fixPasswords() {
  try {
    // Alter column length
    await pool.query('ALTER TABLE students ALTER COLUMN password_hash TYPE VARCHAR(300)');

    // Hash password
    const hash = await bcrypt.hash('password123', 10);

    // Update for john@example.com
    await pool.query('UPDATE students SET password_hash = $1 WHERE email = $2', [hash, 'john@example.com']);

    // Update for jane@example.com
    await pool.query('UPDATE students SET password_hash = $1 WHERE email = $2', [hash, 'jane@example.com']);

    console.log('Passwords fixed');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

fixPasswords();
