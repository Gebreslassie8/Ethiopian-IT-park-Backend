const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Optional test connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("Connected to MySQL database!");
    connection.release();
  } catch (err) {
    console.error("DB connection error:", JSON.stringify({ message: err.message, code: err.code, errno: err.errno, sqlState: err.sqlState, sqlMessage: err.sqlMessage, address: err.address, port: err.port }, null, 2));
  }
})();

module.exports = pool;
