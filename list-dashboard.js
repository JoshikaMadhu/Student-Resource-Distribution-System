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

async function run() {
  try {
    console.log('\n== Students (latest 10) ==');
    const s = await pool.query('SELECT student_id, name, roll_no, email, created_at FROM students ORDER BY student_id DESC LIMIT 10');
    console.table(s.rows);

    if (s.rows.length === 0) {
      console.log('No students found.');
      return;
    }

    const studentId = s.rows[0].student_id;
    console.log(`\nUsing student_id=${studentId} for dashboard queries`);

    const totalResources = await pool.query('SELECT COUNT(*)::int AS cnt FROM resources');
    const activeRequests = await pool.query("SELECT COUNT(*)::int AS cnt FROM requests WHERE student_id = $1 AND status = 'Pending'", [studentId]);
    const issuedItems = await pool.query("SELECT COUNT(*)::int AS cnt FROM transactions WHERE student_id = $1 AND status = 'Issued'", [studentId]);
    const pendingFines = await pool.query("SELECT COALESCE(SUM(amount),0)::numeric(10,2) AS total FROM fines WHERE student_id = $1 AND status = 'Pending'", [studentId]);

    console.log('\n== Dashboard counts ==');
    console.log('totalResources:', totalResources.rows[0].cnt);
    console.log('activeRequests:', activeRequests.rows[0].cnt);
    console.log('issuedItems:', issuedItems.rows[0].cnt);
    console.log('pendingFines:', pendingFines.rows[0].total);

  } catch (err) {
    console.error('Error querying DB:', err.message || err);
  } finally {
    await pool.end();
  }
}

run();
