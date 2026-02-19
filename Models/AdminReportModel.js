const db = require("../Config/db");

const paginate = (page, limit) => {
  const offset = (page - 1) * limit;
  return { offset, limit };
};

// CONTENT PERFORMANCE REPORT
const getContentPerformance = async (page = 1, limit = 10) => {
  const { offset } = paginate(page, limit);

  const [rows] = await db.query(`
    SELECT 
      c.content_id AS id,
      c.title,
      c.author,
      c.download_count AS downloads,
      c.view_count AS views,
      c.access_level,
      c.status,
      DATE_FORMAT(c.uploaded_date, '%Y-%m-%d') AS upload_date,
      c.file_format AS format,
      ROUND(AVG(cui.duration), 0) AS avg_duration_seconds,
      SUM(CASE WHEN cui.duration >= 60 THEN 1 ELSE 0 END) AS engaged_views,
      ROUND(
        (SUM(CASE WHEN cui.duration >= 60 THEN 1 ELSE 0 END) / NULLIF(c.view_count, 0)) * 100,
        1
      ) AS engagement_completion_rate,
      LEAST(
        ROUND((c.download_count / NULLIF(c.view_count, 0)) * 100, 1),
        100
      ) AS download_completion_rate
    FROM content c
    LEFT JOIN content_user_interaction cui 
      ON c.content_id = cui.content_id AND cui.action_type = 'view'
    WHERE c.status != 'archived'
    GROUP BY c.content_id
    ORDER BY (c.view_count + c.download_count) DESC
    LIMIT ? OFFSET ?
  `, [limit, offset]);

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    author: row.author || 'Unknown',
    downloads: row.downloads || 0,
    views: row.views || 0,
    access_level: row.access_level,
    status: row.status,
    upload_date: row.upload_date,
    avg_time: row.avg_duration_seconds ? `${Math.round(row.avg_duration_seconds / 60)} min` : '0 min',
    engaged_views: row.engaged_views || 0,
    engagement_completion_rate: row.engagement_completion_rate || 0,
    download_completion_rate: row.download_completion_rate || 0,
    format: row.format
  }));
};

const getContentPerformanceCount = async () => {
  const [rows] = await db.query(`SELECT COUNT(*) AS total FROM content WHERE status != 'archived'`);
  return rows[0].total;
};

// RETENTION RATE REPORT
const getRetentionRate = async (page = 1, limit = 10) => {
  const { offset } = paginate(page, limit);

  const [rows] = await db.query(`
    SELECT 
      c.content_id AS id,
      c.title,
      c.author,
      c.file_format AS format,
      DATE_FORMAT(c.uploaded_date, '%Y-%m-%d') AS upload_date,
      COUNT(DISTINCT cui.user_id) AS total_users,
      COUNT(DISTINCT CASE WHEN user_view_counts.view_count > 1 THEN cui.user_id END) AS returning_users,
      ROUND(
        (COUNT(DISTINCT CASE WHEN user_view_counts.view_count > 1 THEN cui.user_id END) / 
        NULLIF(COUNT(DISTINCT cui.user_id), 0)) * 100,
        1
      ) AS retention_rate,
      MAX(cui.interaction_time) AS last_accessed
    FROM content c
    LEFT JOIN content_user_interaction cui ON c.content_id = cui.content_id AND cui.action_type = 'view'
    LEFT JOIN (
      SELECT content_id, user_id, COUNT(*) AS view_count
      FROM content_user_interaction
      WHERE action_type = 'view'
      GROUP BY content_id, user_id
    ) AS user_view_counts ON c.content_id = user_view_counts.content_id AND cui.user_id = user_view_counts.user_id
    WHERE c.status != 'archived'
    GROUP BY c.content_id, c.title, c.author, c.file_format, c.uploaded_date
    ORDER BY retention_rate DESC
    LIMIT ? OFFSET ?
  `, [limit, offset]);

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    author: row.author || 'Unknown',
    format: row.format,
    upload_date: row.upload_date,
    retention_rate: row.retention_rate || 0,
    returning_users: row.returning_users || 0,
    total_users: row.total_users || 0,
    last_accessed: row.last_accessed ? row.last_accessed.toISOString().split('T')[0] : 'Never'
  }));
};

const getRetentionRateCount = async () => {
  const [rows] = await db.query(`
    SELECT COUNT(DISTINCT c.content_id) AS total 
    FROM content c
    WHERE c.status != 'archived'
  `);
  return rows[0].total;
};

// DOWNLOADS REPORT
const getDownloads = async (page = 1, limit = 10) => {
  const { offset } = paginate(page, limit);
  const [rows] = await db.query(`
    SELECT 
      c.content_id AS id,
      c.title,
      c.author,
      c.download_count AS downloads,
      cat.name AS category,
      c.file_format AS format
    FROM content c
    LEFT JOIN categories cat ON c.category_id = cat.category_id
    ORDER BY c.download_count DESC
    LIMIT ? OFFSET ?
  `, [limit, offset]);
  return rows;
};

const getDownloadsCount = async () => {
  const [rows] = await db.query(`SELECT COUNT(*) AS total FROM content`);
  return rows[0].total;
};

// VIEWS REPORT
const getViews = async (page = 1, limit = 10) => {
  const { offset } = paginate(page, limit);
  const [rows] = await db.query(`
    SELECT 
      content_id AS id,
      title,
      view_count AS views,
      access_level
    FROM content
    ORDER BY view_count DESC
    LIMIT ? OFFSET ?
  `, [limit, offset]);
  return rows;
};

const getViewsCount = async () => {
  const [rows] = await db.query(`SELECT COUNT(*) AS total FROM content`);
  return rows[0].total;
};

// USERS REPORT
const getUsers = async (page = 1, limit = 10, actionType = null) => {
  const { offset } = paginate(page, limit);
  let query = `
    SELECT 
      cui.id,
      u.username,
      cui.action_type AS action,
      cui.interaction_time,
      cui.duration,
      c.title AS content,
      c.content_id
    FROM content_user_interaction cui
    LEFT JOIN users u ON cui.user_id = u.user_id
    LEFT JOIN content c ON cui.content_id = c.content_id
  `;
  const params = [];

  if (actionType) {
    query += `WHERE cui.action_type = ? `;
    params.push(actionType);
  }

  query += `ORDER BY cui.interaction_time DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await db.query(query, params);
  return rows.map(row => {
    // Format duration based on action type (now without milliseconds)
    let durationText = 'N/A';
    if (row.duration !== null) {
      const durationSeconds = Math.floor(row.duration); // Remove decimal places
      
      if (row.action === 'view') {
        // For views, show HH:MM:SS
        const hours = Math.floor(durationSeconds / 3600);
        const minutes = Math.floor((durationSeconds % 3600) / 60);
        const seconds = durationSeconds % 60;
        durationText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else if (row.action === 'download') {
        // For downloads, show completion time in whole seconds
        durationText = durationSeconds > 0 ? 
          `Completed in ${durationSeconds}s` : 
          'Completed';
      } else {
        // For other actions, just show whole seconds
        durationText = `${durationSeconds}s`;
      }
    }

    return {
      id: row.id,
      username: row.username || 'Unknown',
      action: row.action.charAt(0).toUpperCase() + row.action.slice(1),
      content: row.content || 'Unknown',
      content_id: row.content_id,
      interaction_time: row.interaction_time ? 
        new Date(row.interaction_time).toLocaleString() : 
        'Unknown',
      duration: durationText,
      raw_duration: row.duration // Keep raw value for sorting/filtering
    };
  });
};

const getUsersCount = async (actionType = null) => {
  let query = `SELECT COUNT(*) AS total FROM content_user_interaction`;
  const params = [];

  if (actionType) {
    query += ` WHERE action_type = ?`;
    params.push(actionType);
  }

  const [rows] = await db.query(query, params);
  return rows[0].total;
};

// CATEGORIES REPORT
const getCategories = async (page = 1, limit = 10) => {
  const { offset } = paginate(page, limit);
  const [rows] = await db.query(`
    WITH RECURSIVE category_tree AS (
      -- Base case: top-level categories
      SELECT 
        category_id,
        name,
        parent_category_id,
        0 AS level
      FROM categories
      WHERE parent_category_id IS NULL
      
      UNION ALL
      
      -- Recursive case: subcategories
      SELECT 
        c.category_id,
        c.name,
        c.parent_category_id,
        ct.level + 1
      FROM categories c
      JOIN category_tree ct ON c.parent_category_id = ct.category_id
    ),
    category_counts AS (
      SELECT
        ct.category_id,
        ct.name,
        ct.parent_category_id,
        ct.level,
        COUNT(DISTINCT direct_content.content_id) AS direct_count,
        COUNT(DISTINCT child_content.content_id) AS child_count
      FROM category_tree ct
      LEFT JOIN content direct_content ON ct.category_id = direct_content.category_id
      LEFT JOIN category_tree child_ct ON child_ct.parent_category_id = ct.category_id
      LEFT JOIN content child_content ON child_ct.category_id = child_content.category_id
      GROUP BY ct.category_id, ct.name, ct.parent_category_id, ct.level
    )
    SELECT
      category_id AS id,
      name AS categoryName,
      direct_count AS directUsage,
      child_count AS subcategoryUsage,
      (direct_count + child_count) AS totalUsage,
      CONCAT(direct_count + child_count, ' (', direct_count, ' direct + ', child_count, ' sub)') AS usageCount
    FROM category_counts
    ORDER BY totalUsage DESC, level ASC
    LIMIT ? OFFSET ?
  `, [limit, offset]);

  return rows;
};

const getCategoriesCount = async () => {
  const [rows] = await db.query(`
    SELECT COUNT(*) AS total 
    FROM categories
    WHERE parent_category_id IS NULL
  `);
  return rows[0].total;
};
// STATUS OVERVIEW
const getStatusOverview = async () => {
  try {
    const [rows] = await db.query(
      `SELECT status, COUNT(*) AS value FROM content GROUP BY status`
    );
    return rows.map(item => ({
      name: {
        active: 'Active',
        pending: 'Pending',
        archived: 'Archived'
      }[item.status.toLowerCase()] || item.status,
      value: parseInt(item.value, 10) || 0,
      color: {
        active: '#4CAF50',
        pending: '#FFC107',
        archived: '#9E9E9E'
      }[item.status.toLowerCase()] || '#8884d8'
    }));
  } catch (error) {
    console.error('Error in getStatusOverview:', error.message);
    throw new Error('Failed to fetch status overview');
  }
};

// FREQUENTLY ACCESSED
const getFrequentAccess = async (page = 1, limit = 10) => {
  const { offset } = paginate(page, limit);
  const [rows] = await db.query(`
    SELECT 
      c.content_id AS id,
      c.title,
      COUNT(cui.id) AS accessCount,
      MAX(cui.interaction_time) AS lastAccessed,
      c.file_format AS contentType
    FROM content c
    LEFT JOIN content_user_interaction cui ON c.content_id = cui.content_id
    WHERE cui.action_type = 'view'
    GROUP BY c.content_id, c.title, c.file_format
    ORDER BY accessCount DESC
    LIMIT ? OFFSET ?
  `, [limit, offset]);
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    accessCount: row.accessCount || 0,
    lastAccessed: row.lastAccessed ? row.lastAccessed.toISOString().split('T')[0] : 'Unknown',
    contentType: row.contentType,
  }));
};

// UNDERUTILIZED CONTENT
const getUnderutilized = async (page = 1, limit = 10) => {
  const { offset } = paginate(page, limit);
  const [rows] = await db.query(`
    SELECT 
      c.content_id AS id,
      c.title,
      COUNT(cui.id) AS accessCount,
      MAX(cui.interaction_time) AS lastAccessed,
      c.file_format AS contentType
    FROM content c
    LEFT JOIN content_user_interaction cui ON c.content_id = cui.content_id
    WHERE cui.action_type = 'view' OR cui.action_type IS NULL
    GROUP BY c.content_id, c.title, c.file_format
    ORDER BY accessCount ASC
    LIMIT ? OFFSET ?
  `, [limit, offset]);
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    accessCount: row.accessCount || 0,
    lastAccessed: row.lastAccessed ? row.lastAccessed.toISOString().split('T')[0] : 'Unknown',
    contentType: row.contentType,
  }));
};

// TIME SPENT
const getTimeSpent = async (page = 1, limit = 10) => {
  const { offset } = paginate(page, limit);
  const [rows] = await db.query(`
    SELECT 
      c.content_id AS id,
      c.title,
      AVG(cui.duration) AS averageTime,
      SUM(cui.duration) AS totalTime,
      COUNT(DISTINCT cui.user_id) AS users
    FROM content c
    LEFT JOIN content_user_interaction cui ON c.content_id = cui.content_id
    WHERE cui.action_type = 'view' AND cui.duration IS NOT NULL
    GROUP BY c.content_id, c.title
    ORDER BY totalTime DESC
    LIMIT ? OFFSET ?
  `, [limit, offset]);
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    averageTime: row.averageTime ? `${Math.round(row.averageTime / 60)} min` : '0 min',
    totalTime: row.totalTime ? `${Math.round(row.totalTime / 3600)} hours` : '0 hours',
    users: row.users || 0,
  }));
};

// ACTIVITY STATS REPORT - UPDATED TO INCLUDE BOTH METRICS
const getActivityStats = async () => {
  try {
    // Basic content metrics
    const [[{ totalDownloads }]] = await db.query(`
      SELECT SUM(download_count) AS totalDownloads FROM content 
    `);

    const [[{ totalViews }]] = await db.query(`
      SELECT SUM(view_count) AS totalViews FROM content 
    `);

    const [[{ totalUploads }]] = await db.query(`
      SELECT COUNT(*) AS totalUploads FROM content
    `);

    // Count of users who logged in within last 30 days (using last_login field)
    const [[{ activeUsers }]] = await db.query(`
      SELECT COUNT(*) AS activeUsers 
      FROM users 
      WHERE last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // Count of users with recent content interactions (alternative metric)
    const [[{ engagedUsers }]] = await db.query(`
      SELECT COUNT(DISTINCT user_id) AS engagedUsers 
      FROM content_user_interaction 
      WHERE interaction_time >= DATE_SUB(NOW(), INTERVAL 1 DAY)
    `);

    const [[{ newContent }]] = await db.query(`
      SELECT COUNT(*) AS newContent 
      FROM content 
      WHERE uploaded_date >= NOW() - INTERVAL 1 MONTH
    `);

    return [{
      id: `activityStats-${Date.now()}`, // Auto-generated report ID
      downloads: totalDownloads || 0,
      views: totalViews || 0,
      uploads: totalUploads || 0,
      activeUsers: activeUsers || 0, // Based on last_login
      engagedUsers: engagedUsers || 0, // Based on content interactions
      newContent: newContent || 0,
    }];

  } catch (error) {
    console.error('Error in getActivityStats:', error);
    throw new Error('Failed to fetch activity stats report');
  }
};

module.exports = {
  getDownloads,
  getDownloadsCount,
  getViews,
  getViewsCount,
  getUsers,
  getUsersCount,
  getCategories,
  getCategoriesCount,
  getFrequentAccess,
  getUnderutilized,
  getTimeSpent,
  getContentPerformance,
  getContentPerformanceCount,
  getActivityStats,
  getRetentionRate,
  getRetentionRateCount,
  getStatusOverview
};