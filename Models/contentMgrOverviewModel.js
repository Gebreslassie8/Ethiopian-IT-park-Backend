const db = require("../Config/db");
const { format } = require("date-fns");

const countTotalContents = () => {
  return db.execute("SELECT COUNT(*) as total FROM content");
};

const countNewUploadsThisMonth = () => {
  return db.execute(`
    SELECT COUNT(*) as total
    FROM content
    WHERE MONTH(uploaded_date) = MONTH(CURRENT_DATE())
      AND YEAR(uploaded_date) = YEAR(CURRENT_DATE())
  `);
};

const countNewUploadsLastMonth = () => {
  return db.execute(`
    SELECT COUNT(*) as total
    FROM content
    WHERE MONTH(uploaded_date) = MONTH(CURRENT_DATE() - INTERVAL 1 MONTH)
      AND YEAR(uploaded_date) = YEAR(CURRENT_DATE() - INTERVAL 1 MONTH)
  `);
};

const getTotalDownloads = () => {
  return db.execute(`
    SELECT IFNULL(SUM(download_count), 0) as total FROM content
  `);
};

const getTotalViews = () => {
  return db.execute(`
    SELECT IFNULL(SUM(view_count), 0) as total FROM content
  `);
};

// ✅ FIXED: Added ANY_VALUE to fix the GROUP BY error
const getContentGrowthByMonth = () => {
  return db.execute(`
    SELECT 
      ANY_VALUE(DATE_FORMAT(uploaded_date, '%b %Y')) as month_year,
      ANY_VALUE(DATE_FORMAT(uploaded_date, '%b')) as month,
      YEAR(uploaded_date) as year,
      MONTH(uploaded_date) as month_num,
      COUNT(*) as uploads
    FROM content
    WHERE uploaded_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY YEAR(uploaded_date), MONTH(uploaded_date)
    ORDER BY year ASC, month_num ASC
  `);
};

const getRecentlyUploadedContents = async () => {
  const [rows] = await db.query(`
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

  return rows.map((row) => ({
    ...row,
    uploaded_date: format(new Date(row.uploaded_date), "MMMM d, yyyy, h:mm a"),
  }));
};

module.exports = {
  countTotalContents,
  countNewUploadsThisMonth,
  countNewUploadsLastMonth,
  getTotalDownloads,
  getTotalViews,
  getContentGrowthByMonth,
  getRecentlyUploadedContents,
};