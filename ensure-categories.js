require('dotenv').config();
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

async function ensureCategories() {
  try {
    // First check if categories exist
    const result = await pool.query('SELECT COUNT(*) FROM resource_categories');
    const count = parseInt(result.rows[0].count);
    
    if (count === 0) {
      console.log('No categories found. Adding default categories...');
      // Insert default categories
      await pool.query(`
        INSERT INTO resource_categories (category_name) 
        VALUES ('Books'), ('Equipment'), ('Electronics'), ('Lab Materials'), ('Study Materials')
        ON CONFLICT (category_name) DO NOTHING
      `);
      console.log('Default categories added successfully!');
    } else {
      console.log(`Found ${count} existing categories.`);
    }
    
    // Verify categories
    const cats = await pool.query('SELECT * FROM resource_categories ORDER BY category_name');
    console.log('Current categories:', cats.rows);
  } catch (err) {
    console.error('Error ensuring categories:', err);
  } finally {
    await pool.end();
  }
}

ensureCategories();