const db = require("../Config/db");
const { format } = require("date-fns");

// Get total number of users
const countTotalUsers = async () => {
  const [rows] = await db.execute("SELECT COUNT(*) AS total FROM users");
  return rows[0].total;
};

// Get total number of content items
const countTotalContents = async () => {
  const [rows] = await db.execute("SELECT COUNT(*) AS total FROM content");
  return rows[0].total;
};

// Get new users registered this month
const countNewUsersThisMonth = async () => {
  const [rows] = await db.execute(`
    SELECT COUNT(*) AS total
    FROM users
    WHERE MONTH(created_at) = MONTH(CURRENT_DATE())
      AND YEAR(created_at) = YEAR(CURRENT_DATE())
  `);
  return rows[0].total;
};

// Get new users registered last month
const countNewUsersLastMonth = async () => {
  const [rows] = await db.execute(`
    SELECT COUNT(*) AS total
    FROM users
    WHERE created_at >= DATE_SUB(DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
      AND created_at < DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
  `);
  return rows[0].total;
};

// Get new content uploads this month
const countNewUploadsThisMonth = async () => {
  const [rows] = await db.execute(`
    SELECT COUNT(*) AS total
    FROM content
    WHERE MONTH(uploaded_date) = MONTH(CURRENT_DATE())
      AND YEAR(uploaded_date) = YEAR(CURRENT_DATE())
  `);
  return rows[0].total;
};

// Get new content uploads last month
const countNewUploadsLastMonth = async () => {
  const [rows] = await db.execute(`
    SELECT COUNT(*) AS total
    FROM content
    WHERE uploaded_date >= DATE_SUB(DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
      AND uploaded_date < DATE_FORMAT(CURRENT_DATE(), '%Y-%m-01')
  `);
  return rows[0].total;
};

// Get user growth over the last 12 months
const getUserGrowthByMonth = async () => {
  const [rows] = await db.execute(`
    SELECT 
      DATE_FORMAT(created_at, '%b %Y') AS month_year,
      DATE_FORMAT(created_at, '%b') AS month,
      YEAR(created_at) AS year,
      MONTH(created_at) AS month_num,
      COUNT(*) AS users
    FROM users
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    GROUP BY year, month_num, month, month_year
    ORDER BY year ASC, month_num ASC
  `);
  return rows;
};

// Get recently uploaded content
const getRecentlyUploadedContents = async () => {
  const [rows] = await db.execute(`
    SELECT 
      content_id AS id,
      title,
      categories.name AS category,
      author AS uploader,
      uploaded_date
    FROM content
    LEFT JOIN categories ON content.category_id = categories.category_id
    WHERE uploaded_date >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
    ORDER BY uploaded_date DESC
    LIMIT 10
  `);

  return rows.map(row => ({
    ...row,
    uploaded_date: format(new Date(row.uploaded_date), "MMMM d, yyyy, h:mm a"),
  }));
};

module.exports = {
  countTotalUsers,
  countTotalContents,
  countNewUsersThisMonth,
  countNewUsersLastMonth,
  countNewUploadsThisMonth,
  countNewUploadsLastMonth,
  getUserGrowthByMonth,
  getRecentlyUploadedContents,
};
