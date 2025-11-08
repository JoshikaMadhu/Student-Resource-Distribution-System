require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// PostgreSQL connection setup - prefer DATABASE_URL or PG* vars
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

async function initDB() {
  try {
    const schemaPath = path.join(__dirname, '../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split the schema into individual statements
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (!statement.trim()) continue;
      try {
        await pool.query(statement);
      } catch (err) {
        // Ignore errors that happen when re-running the script (tables/roles already exist, unique inserts)
        const ignorable = ['42P07', '42710', '23505']; // duplicate_table, duplicate_object, unique_violation
        if (ignorable.includes(err.code)) {
          console.log('Warning (ignored):', err.message?.split('\n')[0] || err.message);
          continue;
        }
        // otherwise rethrow
        throw err;
      }
    }

    console.log('Database initialized successfully!');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    await pool.end();
  }
}

initDB();
