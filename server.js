const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection setup
require('dotenv').config();
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

// JWT secret (use env var in production)
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
const JWT_EXPIRY = '24h'; // Token expires in 24 hours

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Auth routes
// Password reset request
app.post("/api/auth/reset-password-request", async (req, res) => {
  const { email } = req.body;
  try {
    // Check if user exists
    const userResult = await pool.query("SELECT student_id FROM students WHERE email = $1", [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Email not found' });
    }
    
    const student_id = userResult.rows[0].student_id;
    
    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign({ student_id, email }, JWT_SECRET, { expiresIn: '1h' });
    
    // Store reset token in database
    await pool.query(
      "INSERT INTO password_reset_tokens (student_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')",
      [student_id, resetToken]
    );
    
    // In a real application, send email with reset link
    // For demo purposes, we'll just return the token
    res.json({ 
      success: true, 
      message: 'Password reset link has been sent to your email',
      resetToken // In production, remove this and send via email
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to process password reset request' });
  }
});

// Password reset completion
app.post("/api/auth/reset-password", async (req, res) => {
  const { token, new_password } = req.body;
  
  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if token exists in database and is not expired
    const tokenResult = await pool.query(
      "SELECT * FROM password_reset_tokens WHERE student_id = $1 AND token = $2 AND expires_at > NOW() AND used = FALSE",
      [decoded.student_id, token]
    );
    
    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);
    
    // Update password
    await pool.query(
      "UPDATE students SET password_hash = $1 WHERE student_id = $2",
      [hashedPassword, decoded.student_id]
    );
    
    // Mark token as used
    await pool.query(
      "UPDATE password_reset_tokens SET used = TRUE WHERE token = $1",
      [token]
    );
    
    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (err) {
    console.error(err);
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { name, roll_no, year, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO students (name, roll_no, year, email, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING student_id, name, roll_no, year, email",
      [name, roll_no, year, email, hashedPassword]
    );
    const user = result.rows[0];
    const token = jwt.sign({ student_id: user.student_id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    res.json({ success: true, user, token });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') res.status(400).json({ success: false, message: 'Email or roll number already exists' });
    else res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM students WHERE email = $1", [email]);
    if (result.rows.length === 0) return res.status(400).json({ success: false, message: 'Invalid email or password' });

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(400).json({ success: false, message: 'Invalid email or password' });

    const token = jwt.sign({ student_id: user.student_id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    // Log login
    await pool.query("INSERT INTO login_logs (student_id) VALUES ($1)", [user.student_id]);

    res.json({ success: true, user: { student_id: user.student_id, name: user.name, roll_no: user.roll_no, year: user.year, email: user.email }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

app.post("/api/auth/logout", authenticateToken, async (req, res) => {
  try {
    // Update logout time for latest login log
    await pool.query(
      "UPDATE login_logs SET logout_time = CURRENT_TIMESTAMP WHERE student_id = $1 AND logout_time IS NULL ORDER BY login_time DESC LIMIT 1",
      [req.user.student_id]
    );
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
});

// Dashboard
app.get("/api/dashboard/:studentId", authenticateToken, async (req, res) => {
  const { studentId } = req.params;
  if (req.user.student_id != studentId) return res.status(403).json({ success: false, message: 'Unauthorized' });

  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM resources) AS totalResources,
        (SELECT COUNT(*) FROM requests WHERE student_id = $1 AND status = 'Pending') AS activeRequests,
        (SELECT COUNT(*) FROM transactions WHERE student_id = $1 AND status = 'Issued') AS issuedItems,
        (SELECT COALESCE(SUM(amount), 0) FROM fines WHERE student_id = $1 AND status = 'Pending') AS pendingFines
    `, [studentId]);

    const notifications = await pool.query(
      "SELECT notification_id, message, created_at, is_read FROM notifications WHERE student_id = $1 ORDER BY created_at DESC LIMIT 5",
      [studentId]
    );

    res.json({ success: true, stats: stats.rows[0], notifications: notifications.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard' });
  }
});

// Resources
// Get all categories
app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    // First ensure we have our base categories
    const baseCategories = ['Books', 'Equipment', 'Electronics', 'Lab Materials', 'Study Materials'];
    
    // Insert base categories if they don't exist
    await pool.query(`
      INSERT INTO resource_categories (category_name)
      VALUES ${baseCategories.map((cat, i) => `($${i + 1})`).join(', ')}
      ON CONFLICT (category_name) DO NOTHING
    `, baseCategories);

    // Now fetch all categories
    const result = await pool.query('SELECT category_id, category_name FROM resource_categories ORDER BY category_name');
    console.log('Categories fetched:', result.rows);
    res.json({ success: true, categories: result.rows });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});



// Get all resources
app.get("/api/resources", authenticateToken, async (req, res) => {
  try {
    const { search, category, available_only } = req.query;
    
    // Build the query with optional filters
    let query = `
      SELECT r.resource_id, r.name, rc.category_name AS category, r.total_quantity, r.available_quantity, r.description, 
      s.name AS contributed_by, r.student_id AS contributor_id
      FROM resources r
      LEFT JOIN resource_categories rc ON r.category_id = rc.category_id
      LEFT JOIN students s ON r.student_id = s.student_id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Add search filter if provided
    if (search) {
      queryParams.push(`%${search}%`);
      query += ` AND (r.name ILIKE $${queryParams.length} OR r.description ILIKE $${queryParams.length})`;
    }
    
    // Add category filter if provided
    if (category) {
      queryParams.push(category);
      query += ` AND rc.category_name = $${queryParams.length}`;
    }
    
    // Add availability filter if requested
    if (available_only === 'true') {
      query += ` AND r.available_quantity > 0`;
    }
    
    // Add sorting and limit
    query += ` ORDER BY r.name ASC LIMIT 50`;
    
    const result = await pool.query(query, queryParams);
    res.json({ success: true, resources: result.rows });
  } catch (err) {
    console.error('Error fetching resources:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch resources' });
  }
});

// Add a new resource (user contribution)
app.post("/api/resources", authenticateToken, async (req, res) => {
  const { name, category_id, description, quantity } = req.body;
  const student_id = req.user.student_id;
  
  console.log('Resource addition request received:', { name, category_id, description, quantity, student_id });
  
  try {
    // Insert the new resource
    const result = await pool.query(
      "INSERT INTO resources (name, category_id, description, total_quantity, available_quantity, student_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING resource_id",
      [name, category_id, description, quantity, quantity, student_id]
    );
    
    console.log('Resource added successfully:', result.rows[0]);
    
    // Create notification for the user
    await pool.query(
      "INSERT INTO notifications (student_id, message) VALUES ($1, $2)",
      [student_id, `Your resource "${name}" has been added successfully.`]
    );
    
    res.json({ 
      success: true, 
      message: 'Resource added successfully', 
      resource_id: result.rows[0].resource_id 
    });
  } catch (err) {
    console.error('Error adding resource:', err);
    res.status(500).json({ success: false, message: 'Failed to add resource' });
  }
});

// Requests
app.post("/api/requests", authenticateToken, async (req, res) => {
  const { student_id, resource_id } = req.body;
  if (req.user.student_id != student_id) return res.status(403).json({ success: false, message: 'Unauthorized' });

  try {
    // Check if resource is available
    const resource = await pool.query("SELECT available_quantity FROM resources WHERE resource_id = $1", [resource_id]);
    if (resource.rows[0].available_quantity <= 0) return res.status(400).json({ success: false, message: 'Resource not available' });

    // Insert request
    const request = await pool.query(
      "INSERT INTO requests (student_id, resource_id) VALUES ($1, $2) RETURNING request_id",
      [student_id, resource_id]
    );

    // Auto-create transaction and reduce quantity
    await pool.query(`
      INSERT INTO transactions (student_id, resource_id, request_id, due_date)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '14 days')
    `, [student_id, resource_id, request.rows[0].request_id]);

    await pool.query("UPDATE resources SET available_quantity = available_quantity - 1 WHERE resource_id = $1", [resource_id]);

    // Notification
    await pool.query(
      "INSERT INTO notifications (student_id, message) VALUES ($1, 'Your request for ' || (SELECT name FROM resources WHERE resource_id = $2) || ' has been submitted.')",
      [student_id, resource_id]
    );

    res.json({ success: true, message: 'Request submitted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to submit request' });
  }
});

app.get("/api/requests/:studentId", authenticateToken, async (req, res) => {
  const { studentId } = req.params;
  if (req.user.student_id != studentId) return res.status(403).json({ success: false, message: 'Unauthorized' });

  try {
    const result = await pool.query(`
      SELECT r.request_id, res.name AS resource_name, r.request_date, r.status
      FROM requests r
      JOIN resources res ON r.resource_id = res.resource_id
      WHERE r.student_id = $1
      ORDER BY r.request_date DESC
    `, [studentId]);
    res.json({ success: true, requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
});

// Transactions
app.get("/api/transactions/:studentId", authenticateToken, async (req, res) => {
  const { studentId } = req.params;
  if (req.user.student_id != studentId) return res.status(403).json({ success: false, message: 'Unauthorized' });

  try {
    const result = await pool.query(`
      SELECT t.transaction_id, res.name AS resource_name, t.issue_date, t.return_date, t.status
      FROM transactions t
      JOIN resources res ON t.resource_id = res.resource_id
      WHERE t.student_id = $1
      ORDER BY t.issue_date DESC
    `, [studentId]);
    res.json({ success: true, transactions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
});

app.put("/api/transactions/:transactionId/return", authenticateToken, async (req, res) => {
  const { transactionId } = req.params;
  try {
    // Get transaction details
    const trans = await pool.query(`
      SELECT t.student_id, t.resource_id, t.due_date
      FROM transactions t
      WHERE t.transaction_id = $1 AND t.status = 'Issued'
    `, [transactionId]);
    if (trans.rows.length === 0) return res.status(404).json({ success: false, message: 'Transaction not found or already returned' });
    if (req.user.student_id != trans.rows[0].student_id) return res.status(403).json({ success: false, message: 'Unauthorized' });

    const { resource_id, due_date } = trans.rows[0];

    // Update transaction
    await pool.query("UPDATE transactions SET return_date = CURRENT_TIMESTAMP, status = 'Returned' WHERE transaction_id = $1", [transactionId]);

    // Increase quantity
    await pool.query("UPDATE resources SET available_quantity = available_quantity + 1 WHERE resource_id = $1", [resource_id]);

    // Check for fine if late
    if (new Date() > new Date(due_date)) {
      const daysLate = Math.ceil((new Date() - new Date(due_date)) / (1000 * 60 * 60 * 24));
      const fineAmount = daysLate * 10; // e.g., 10 per day
      await pool.query(
        "INSERT INTO fines (student_id, resource_id, transaction_id, amount, reason) VALUES ($1, $2, $3, $4, 'Late return')",
        [req.user.student_id, resource_id, transactionId, fineAmount]
      );
      await pool.query(
        "INSERT INTO notifications (student_id, message) VALUES ($1, 'Fine of ₹' || $2 || ' imposed for late return of ' || (SELECT name FROM resources WHERE resource_id = $3))",
        [req.user.student_id, fineAmount, resource_id]
      );
    }

    res.json({ success: true, message: 'Resource returned' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to return resource' });
  }
});

// Fines
app.get("/api/fines/:studentId", authenticateToken, async (req, res) => {
  const { studentId } = req.params;
  if (req.user.student_id != studentId) return res.status(403).json({ success: false, message: 'Unauthorized' });

  try {
    const result = await pool.query(`
      SELECT f.fine_id, res.name AS resource_name, f.amount, f.reason, f.status, f.created_at
      FROM fines f
      JOIN resources res ON f.resource_id = res.resource_id
      WHERE f.student_id = $1
      ORDER BY f.created_at DESC
    `, [studentId]);
    res.json({ success: true, fines: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch fines' });
  }
});

// Feedback
app.post("/api/feedback", authenticateToken, async (req, res) => {
  const { student_id, rating, comments } = req.body;
  if (req.user.student_id != student_id) return res.status(403).json({ success: false, message: 'Unauthorized' });

  try {
    await pool.query("INSERT INTO feedback (student_id, rating, comments) VALUES ($1, $2, $3)", [student_id, rating, comments]);
    res.json({ success: true, message: 'Feedback submitted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to submit feedback' });
  }
});

// Notifications
app.get("/api/notifications/:studentId", authenticateToken, async (req, res) => {
  const { studentId } = req.params;
  if (req.user.student_id != studentId) return res.status(403).json({ success: false, message: 'Unauthorized' });

  try {
    const result = await pool.query(
      "SELECT notification_id, message, created_at, is_read FROM notifications WHERE student_id = $1 ORDER BY created_at DESC",
      [studentId]
    );
    res.json({ success: true, notifications: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

app.put("/api/notifications/:notificationId/read", authenticateToken, async (req, res) => {
  const { notificationId } = req.params;
  try {
    const notif = await pool.query("SELECT student_id FROM notifications WHERE notification_id = $1", [notificationId]);
    if (notif.rows.length === 0) return res.status(404).json({ success: false, message: 'Notification not found' });
    if (req.user.student_id != notif.rows[0].student_id) return res.status(403).json({ success: false, message: 'Unauthorized' });

    await pool.query("UPDATE notifications SET is_read = TRUE WHERE notification_id = $1", [notificationId]);
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
});

// Test route
app.get("/", (req, res) => {
  res.send("Student Resource Management System API");
});

// Health check - verifies DB connectivity
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT 1 as ok');
    if (result && result.rows) return res.json({ success: true, db: true, time: new Date().toISOString() });
    return res.status(500).json({ success: false, db: false });
  } catch (err) {
    console.error('Health check failed', err);
    return res.status(500).json({ success: false, db: false, error: err.message });
  }
});

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
