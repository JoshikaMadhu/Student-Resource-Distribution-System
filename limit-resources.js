require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function limitResources() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get current resources
    const { rows: resources } = await client.query('SELECT * FROM resources ORDER BY name');
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
    
    // Limit to 50 resources
    const limitedResources = uniqueResources.slice(0, 50);
    console.log(`Limited to 50 resources`);
    
    // Delete all resources
    await client.query('DELETE FROM resources');
    console.log('Deleted all resources');
    
    // Re-insert the limited resources
    for (const resource of limitedResources) {
      await client.query(
        'INSERT INTO resources (category_id, name, description, total_quantity, available_quantity, student_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          resource.category_id,
          resource.name,
          resource.description,
          resource.total_quantity,
          resource.available_quantity,
          resource.student_id || null
        ]
      );
    }
    
    console.log(`Re-inserted ${limitedResources.length} unique resources`);
    
    await client.query('COMMIT');
    console.log('Transaction committed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error limiting resources:', err);
  } finally {
    client.release();
    pool.end();
  }
}

limitResources().catch(console.error);