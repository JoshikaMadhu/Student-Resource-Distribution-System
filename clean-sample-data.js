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

async function cleanupDuplicates() {
  try {
    console.log('Removing duplicate resource_categories (by category_name)');
    await pool.query("DELETE FROM resource_categories a USING resource_categories b WHERE a.category_id > b.category_id AND a.category_name = b.category_name;");

    console.log('Removing duplicate students (by roll_no)');
    await pool.query("DELETE FROM students a USING students b WHERE a.student_id > b.student_id AND a.roll_no = b.roll_no;");

    console.log('Removing duplicate resources (by name)');
    await pool.query("DELETE FROM resources a USING resources b WHERE a.resource_id > b.resource_id AND a.name = b.name;");

    console.log('Removing duplicate notifications (same student and message and created_at)');
    await pool.query("DELETE FROM notifications a USING notifications b WHERE a.notification_id > b.notification_id AND a.student_id = b.student_id AND a.message = b.message AND a.created_at = b.created_at;");

    console.log('Duplicate cleanup completed');
  } catch (err) {
    console.error('Error during duplicate cleanup', err);
  }
}

async function ensureSampleData() {
  try {
    console.log('Ensuring resource categories exist');
    const categories = ['Books','Equipment','Electronics','Lab Kits','Accessories'];
    for (const c of categories) {
      // cast parameter to varchar to avoid inconsistent param type inference across repeated prepared statements
      await pool.query("INSERT INTO resource_categories (category_name) SELECT $1::varchar WHERE NOT EXISTS (SELECT 1 FROM resource_categories WHERE category_name = $1::varchar)", [c]);
    }

    console.log('Ensuring sample resources exist');
    const resources = [
      { name: 'Introduction to Algorithms', category: 'Books', total: 10, avail: 8, desc: 'A comprehensive book on algorithms' },
      { name: 'Laptop Charger', category: 'Electronics', total: 5, avail: 3, desc: 'Universal laptop charger' },
      { name: 'Projector', category: 'Equipment', total: 2, avail: 1, desc: 'HD Projector for presentations' },
      { name: 'Arduino Starter Kit', category: 'Lab Kits', total: 4, avail: 3, desc: 'Kit with Arduino board and sensors' },
      { name: 'Raspberry Pi 4', category: 'Lab Kits', total: 3, avail: 2, desc: 'Raspberry Pi single-board computer' },
      { name: 'Wireless Mouse', category: 'Accessories', total: 15, avail: 14, desc: 'Ergonomic wireless mouse' },
      { name: 'External Hard Drive 1TB', category: 'Electronics', total: 5, avail: 5, desc: 'USB 3.0 external HDD' }
    ];

    for (const r of resources) {
      // resolve category_id
  const cat = await pool.query('SELECT category_id FROM resource_categories WHERE category_name = $1::varchar LIMIT 1', [r.category]);
      const catId = cat.rows[0] ? cat.rows[0].category_id : null;
      if (!catId) continue;
      await pool.query(
        `INSERT INTO resources (name, category_id, total_quantity, available_quantity, description)
         SELECT $1::varchar, $2::int, $3::int, $4::int, $5::text
         WHERE NOT EXISTS (SELECT 1 FROM resources WHERE name = $1::varchar AND category_id = $2::int)`,
        [r.name, catId, r.total, r.avail, r.desc]
      );
    }

    console.log('Ensuring sample students exist');
    await pool.query(`INSERT INTO students (name, roll_no, year, email, password_hash)
      SELECT 'John Doe', 'CS001', 2, 'john@example.com', '$2b$10$q4Op/sG80Xoy0tsKDPJEne5xjLmw0fl6F6HqRft43wj7MQqCrJMji'
      WHERE NOT EXISTS (SELECT 1 FROM students WHERE roll_no = 'CS001');
    `);
    await pool.query(`INSERT INTO students (name, roll_no, year, email, password_hash)
      SELECT 'Jane Smith', 'CS002', 3, 'jane@example.com', '$2b$10$q4Op/sG80Xoy0tsKDPJEne5xjLmw0fl6F6HqRft43wj7MQqCrJMji'
      WHERE NOT EXISTS (SELECT 1 FROM students WHERE roll_no = 'CS002');
    `);

    console.log('Ensuring sample requests/transactions/notifications/fines');
    // find ids
    const john = await pool.query("SELECT student_id FROM students WHERE roll_no = 'CS001' LIMIT 1");
    if (john.rows.length === 0) throw new Error('Seed student John not found');
    const johnId = john.rows[0].student_id;

    const arduino = await pool.query("SELECT resource_id FROM resources WHERE name = 'Arduino Starter Kit' LIMIT 1");
    if (arduino.rows.length > 0) {
      const resId = arduino.rows[0].resource_id;
      // request
      await pool.query(`INSERT INTO requests (student_id, resource_id, status)
        SELECT $1, $2, 'Pending' WHERE NOT EXISTS (SELECT 1 FROM requests WHERE student_id = $1 AND resource_id = $2)`, [johnId, resId]);

      // transaction (if there's a request but no transaction for it)
      await pool.query(`INSERT INTO transactions (student_id, resource_id, request_id, due_date)
        SELECT r.student_id, r.resource_id, r.request_id, CURRENT_TIMESTAMP + INTERVAL '14 days'
        FROM requests r
        WHERE r.student_id = $1 AND r.resource_id = $2
          AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.request_id = r.request_id) LIMIT 1`, [johnId, resId]);

      // notification
      await pool.query(`INSERT INTO notifications (student_id, message)
        SELECT $1, 'Your request for ' || (SELECT name FROM resources WHERE resource_id = $2) || ' has been recorded.'
        WHERE NOT EXISTS (SELECT 1 FROM notifications n WHERE n.student_id = $1 AND n.message LIKE 'Your request for %' )`, [johnId, resId]);

      // fine example (only if none exists for john)
      await pool.query(`INSERT INTO fines (student_id, resource_id, transaction_id, amount, reason)
        SELECT $1, $2, t.transaction_id, 0.00, 'No fine - sample' FROM transactions t
        WHERE t.student_id = $1 AND t.resource_id = $2 AND NOT EXISTS (SELECT 1 FROM fines f WHERE f.student_id = $1 AND f.resource_id = $2) LIMIT 1`, [johnId, resId]);
    }

    console.log('Sample data ensured');
  } catch (err) {
    console.error('Error ensuring sample data', err);
  }
}

async function main() {
  try {
    await cleanupDuplicates();
    await ensureSampleData();
  } finally {
    await pool.end();
  }
}

main().then(() => console.log('clean-sample-data.js finished')).catch(e => { console.error(e); process.exit(1); });
