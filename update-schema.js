const { Pool } = require("pg");
require('dotenv').config();

// PostgreSQL connection setup
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

async function updateSchema() {
  try {
    console.log('Starting database schema update...');
    
    // Check if student_id column exists in resources table
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'resources' AND column_name = 'student_id'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('Adding student_id column to resources table...');
      await pool.query(`
        ALTER TABLE resources 
        ADD COLUMN student_id INTEGER REFERENCES students(student_id) ON DELETE SET NULL
      `);
      console.log('Added student_id column to resources table');
    } else {
      console.log('student_id column already exists in resources table');
    }
    
    // Check if password_reset_tokens table exists
    const checkTable = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'password_reset_tokens'
    `);
    
    if (checkTable.rows.length === 0) {
      console.log('Creating password_reset_tokens table...');
      await pool.query(`
        CREATE TABLE password_reset_tokens (
          token_id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES students(student_id) ON DELETE CASCADE,
          token TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Created password_reset_tokens table');
    } else {
      console.log('password_reset_tokens table already exists');
    }
    
    // Limit resources to 50 unique entries
    console.log('Limiting resources to 50 unique entries...');
    
    // Get current resources
    const { rows: resources } = await pool.query('SELECT * FROM resources ORDER BY name');
    console.log(`Current resource count: ${resources.length}`);
    
    // Create a set of unique resource names to remove duplicates
    const uniqueResourceNames = new Set();
    const uniqueResources = [];
    
    for (const resource of resources) {
      if (!uniqueResourceNames.has(resource.name.toLowerCase())) {
        uniqueResourceNames.add(resource.name.toLowerCase());
        uniqueResources.push(resource);
      }
    }
    
    console.log(`Unique resource count: ${uniqueResources.length}`);
    
    // Limit to 50 resources if there are more than 50
    if (uniqueResources.length > 50) {
      // Begin transaction for resource update
      await pool.query('BEGIN');
      
      try {
        // Delete all resources
        await pool.query('DELETE FROM resources');
        console.log('Deleted all resources');
        
        // Re-insert the limited resources (50)
        const limitedResources = uniqueResources.slice(0, 50);
        
        for (const resource of limitedResources) {
          await pool.query(
            'INSERT INTO resources (resource_id, category_id, name, description, total_quantity, available_quantity, student_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [
              resource.resource_id,
              resource.category_id,
              resource.name,
              resource.description,
              resource.total_quantity,
              resource.available_quantity,
              resource.student_id || null
            ]
          );
        }
        
        await pool.query('COMMIT');
        console.log(`Limited resources to 50 unique entries`);
      } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Error limiting resources:', err);
      }
    } else {
      console.log('No need to limit resources, already have 50 or fewer unique entries');
    }
    
    console.log('Database schema update completed successfully');
  } catch (err) {
    console.error('Error updating database schema:', err);
  } finally {
    await pool.end();
  }
}

updateSchema();