const db = require("../Config/db");

exports.getActiveUsersByMonth = async (year) => {
  const [rows] = await db.query(
    `
    SELECT 
      ANY_VALUE(DATE_FORMAT(last_login, '%b')) AS month,
      MONTH(last_login) AS month_num,
      COUNT(DISTINCT user_id) AS users
    FROM users
    WHERE YEAR(last_login) = ?
    GROUP BY month_num
    ORDER BY month_num`,
    [year]
  );
  return rows;
};

exports.getMonthlyActivity = async (year) => {
  const [rows] = await db.execute(
    `SELECT
       ANY_VALUE(DATE_FORMAT(uploaded_date, '%b')) AS month,
       COUNT(*) AS uploads,
       COALESCE(SUM(download_count), 0) AS downloads
     FROM content
     WHERE YEAR(uploaded_date) = ?
     GROUP BY MONTH(uploaded_date)
     ORDER BY MONTH(uploaded_date)`,
    [year]
  );
  return rows;
};

exports.getFrequentlyAccessedContents = async () => {
  const [rows] = await db.query(`
    SELECT 
      c.content_id,
      ANY_VALUE(c.title) AS title,
      ANY_VALUE(c.author) AS creator,
      ANY_VALUE(cat.name) AS category,
      COUNT(*) AS interaction_count
    FROM content_user_interaction cui
    JOIN content c ON c.content_id = cui.content_id
    JOIN categories cat ON c.category_id = cat.category_id
    WHERE cui.action_type IN ('view', 'download')
      AND cui.interaction_time >= NOW() - INTERVAL 30 DAY
    GROUP BY c.content_id
    ORDER BY interaction_count DESC
    LIMIT 7
  `);
  return rows;
};

exports.getUnderutilizedContents = async () => {
  const [rows] = await db.query(`
    SELECT 
      c.content_id,
      ANY_VALUE(c.title) AS title,
      ANY_VALUE(c.author) AS creator,
      ANY_VALUE(cat.name) AS category,
      COUNT(cui.id) AS interaction_count
    FROM content c
    LEFT JOIN content_user_interaction cui 
      ON c.content_id = cui.content_id 
      AND cui.interaction_time >= NOW() - INTERVAL 30 DAY
    JOIN categories cat ON c.category_id = cat.category_id
    GROUP BY c.content_id
    HAVING interaction_count <= 2
    ORDER BY interaction_count ASC
    LIMIT 7
  `);
  return rows;
};

exports.getTimeSpentPerCategory = async () => {
  const [rows] = await db.query(`
    SELECT 
      ANY_VALUE(categories.name) AS category,
      ROUND(SUM(content_user_interaction.duration) / 60, 2) AS minutes
    FROM content_user_interaction
    JOIN content ON content_user_interaction.content_id = content.content_id
    JOIN categories ON content.category_id = categories.category_id
    WHERE categories.parent_category_id IS NULL 
    GROUP BY categories.category_id
    ORDER BY minutes DESC
  `);
  return rows;
};