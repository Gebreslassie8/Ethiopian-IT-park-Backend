const db = require('../Config/db');

const paginate = (page, limit) => {
  const offset = (page - 1) * limit;
  return { offset, limit };
};

const CMReportModel = {
  async getRecentUploads(limit, offset) {
    try {
      const [rows] = await db.query(
        `SELECT 
           content_id AS id, 
           title, 
           status, 
           uploaded_date AS upload_date, 
           view_count AS views, 
           download_count AS downloads,
           author,
           file_format,
           access_level
         FROM content
         WHERE status != 'archived'
         ORDER BY uploaded_date DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      return rows.map(row => ({
        ...row,
        upload_date: row.upload_date ? new Date(row.upload_date).toISOString().split('T')[0] : 'Unknown'
      }));
    } catch (error) {
      console.error('Error in getRecentUploads:', error.message);
      throw new Error('Failed to fetch uploads');
    }
  },

  async countRecentUploads() {
    try {
      const [rows] = await db.query(
        `SELECT COUNT(*) AS count FROM content WHERE status != 'archived'`
      );
      return rows[0].count;
    } catch (error) {
      console.error('Error in countRecentUploads:', error.message);
      throw new Error('Failed to count uploads');
    }
  },

  async getStatusOverview() {
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
  },

  async getContentPerformance(limit, offset) {
    try {
      const [rows] = await db.query(
        `SELECT 
           c.content_id AS id, 
           c.title, 
           c.author,
           c.file_format,
           c.access_level,
           c.status,
           DATE_FORMAT(c.uploaded_date, '%Y-%m-%d') AS upload_date,
           c.view_count AS views, 
           c.download_count AS downloads,
           ROUND(AVG(cui.duration), 0) AS avg_duration_seconds,
           SUM(CASE WHEN cui.duration >= 60 THEN 1 ELSE 0 END) AS engaged_views,
           ROUND((SUM(CASE WHEN cui.duration >= 60 THEN 1 ELSE 0 END) / NULLIF(c.view_count, 0)) * 100, 1) AS engagement_completion_rate,
           LEAST(
             ROUND((c.download_count / NULLIF(c.view_count, 0)) * 100, 1),
             100
           ) AS download_completion_rate
         FROM content c
         LEFT JOIN content_user_interaction cui 
           ON c.content_id = cui.content_id AND cui.action_type = 'view'
         WHERE c.status != 'archived'
         GROUP BY c.content_id
         ORDER BY c.view_count DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      return rows.map(row => ({
        id: row.id,
        title: row.title,
        author: row.author || 'Unknown',
        file_format: row.file_format,
        access_level: row.access_level,
        status: row.status,
        upload_date: row.upload_date,
        views: row.views || 0,
        downloads: row.downloads || 0,
        avg_time: row.avg_duration_seconds
          ? `${Math.round(row.avg_duration_seconds / 60)} min`
          : '0 min',
        engaged_views: row.engaged_views || 0,
        engagement_completion_rate: row.engagement_completion_rate || 0,
        download_completion_rate: row.download_completion_rate || 0
      }));
    } catch (error) {
      console.error('Error in getContentPerformance:', error.message);
      throw new Error('Failed to fetch content performance');
    }
  },

  async countContentPerformance() {
    try {
      const [rows] = await db.query(
        `SELECT COUNT(*) AS count FROM content WHERE status != 'archived'`
      );
      return rows[0].count;
    } catch (error) {
      console.error('Error in countContentPerformance:', error.message);
      throw new Error('Failed to count content performance');
    }
  },

  async getRetentionRate(limit, offset) {
    try {
      const [rows] = await db.query(
        `SELECT 
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
        LIMIT ? OFFSET ?`,
        [limit, offset]
      );

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
    } catch (error) {
      console.error('Error in getRetentionRate:', error.message);
      throw new Error('Failed to fetch retention rate data');
    }
  },

  async countRetentionRate() {
    try {
      const [rows] = await db.query(
        `SELECT COUNT(DISTINCT c.content_id) AS count 
         FROM content c
         WHERE c.status != 'archived'`
      );
      return rows[0].count;
    } catch (error) {
      console.error('Error in countRetentionRate:', error.message);
      throw new Error('Failed to count retention rate data');
    }
  },

  async getTimeSpent(limit, offset) {
    try {
      const [rows] = await db.query(
        `SELECT 
           c.content_id AS id, 
           c.title, 
           AVG(cui.duration) AS avg_duration_seconds,
           SUM(cui.duration) AS total_duration_seconds,
           COUNT(DISTINCT cui.user_id) AS users
         FROM content c
         LEFT JOIN content_user_interaction cui 
           ON c.content_id = cui.content_id AND cui.action_type = 'view'
         WHERE c.status != 'archived' AND cui.duration IS NOT NULL
         GROUP BY c.content_id, c.title
         ORDER BY total_duration_seconds DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      return rows.map(row => ({
        id: row.id,
        title: row.title,
        avg_time: row.avg_duration_seconds
          ? `${Math.round(row.avg_duration_seconds / 60)} min`
          : '0 min',
        total_time: row.total_duration_seconds
          ? `${Math.round(row.total_duration_seconds / 3600)} hours`
          : '0 hours',
        users: parseInt(row.users, 10) || 0
      }));
    } catch (error) {
      console.error('Error in getTimeSpent:', error.message);
      throw new Error('Failed to fetch time spent');
    }
  },

  async countTimeSpent() {
    try {
      const [rows] = await db.query(
        `SELECT COUNT(DISTINCT content_id) AS count FROM content WHERE status != 'archived'`
      );
      return rows[0].count;
    } catch (error) {
      console.error('Error in countTimeSpent:', error.message);
      throw new Error('Failed to count time spent');
    }
  },

  async getFrequentAccess(limit, offset) {
    try {
      const [rows] = await db.query(
        `SELECT 
           c.content_id AS id, 
           c.title, 
           COALESCE(COUNT(cui.id), 0) AS access_count,
           MAX(cui.interaction_time) AS last_accessed, 
           c.file_format AS content_type
         FROM content c
         LEFT JOIN content_user_interaction cui ON c.content_id = cui.content_id AND cui.action_type = 'view' 
         WHERE c.status != 'archived'
         GROUP BY c.content_id, c.title, c.file_format
         ORDER BY access_count DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      return rows.map(row => ({
        ...row,
        access_count: parseInt(row.access_count, 10) || 0,
        last_accessed: row.last_accessed ? row.last_accessed.toISOString().split('T')[0] : 'Never'
      }));
    } catch (error) {
      console.error('Error in getFrequentAccess:', error.message);
      throw new Error('Failed to fetch frequent access');
    }
  },

  async countFrequentAccess() {
    try {
      const [rows] = await db.query(
        `SELECT COUNT(DISTINCT content_id) AS count FROM content WHERE status != 'archived'`
      );
      return rows[0].count;
    } catch (error) {
      console.error('Error in countFrequentAccess:', error.message);
      throw new Error('Failed to count frequent access');
    }
  },

  async getUnderutilized(limit, offset) {
    try {
      const [rows] = await db.query(
        `SELECT 
           c.content_id AS id,
           c.title,
           COALESCE(COUNT(cui.id), 0) AS access_count,
           MAX(cui.interaction_time) AS last_accessed,
           c.file_format AS content_type
         FROM content c
         LEFT JOIN content_user_interaction cui ON c.content_id = cui.content_id AND cui.action_type = 'view'
         WHERE c.status != 'archived'
         GROUP BY c.content_id, c.title, c.file_format
         HAVING access_count <= 10
         ORDER BY access_count ASC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      return rows.map(row => ({
        ...row,
        access_count: parseInt(row.access_count, 10) || 0,
        last_accessed: row.last_accessed ? row.last_accessed.toISOString().split('T')[0] : 'Never'
      }));
    } catch (error) {
      console.error('Error in getUnderutilized:', error.message);
      throw new Error('Failed to fetch underutilized content');
    }
  },

  async countUnderutilized() {
    try {
      const [rows] = await db.query(
        `SELECT COUNT(*) AS count FROM (
          SELECT c.content_id
          FROM content c
          LEFT JOIN content_user_interaction cui ON c.content_id = cui.content_id AND cui.action_type = 'view'
          WHERE c.status != 'archived'
          GROUP BY c.content_id
          HAVING COUNT(cui.id) <= 10
        ) AS subquery`
      );
      return rows[0].count;
    } catch (error) {
      console.error('Error in countUnderutilized:', error.message);
      throw new Error('Failed to count underutilized content');
    }
  },

  async getActivityStats() {
    try {
      const [rows] = await db.query(`SELECT 
          (SELECT SUM(view_count) FROM content ) AS views,
          (SELECT SUM(download_count) FROM content) AS downloads,
          (SELECT COUNT(*) FROM content ) AS uploads,
          (SELECT COUNT(*) FROM content WHERE uploaded_date >= NOW() - INTERVAL 1 MONTH ) AS newContent
      `);
      return {
        views: parseInt(rows[0].views, 10) || 0,
        downloads: parseInt(rows[0].downloads, 10) || 0,
        uploads: parseInt(rows[0].uploads, 10) || 0,
        activeUsers: parseInt(rows[0].activeUsers, 10) || 0,
        newContent: parseInt(rows[0].newContent, 10) || 0
      };
    } catch (error) {
      console.error('Error in getActivityStats:', error.message);
      throw new Error('Failed to fetch activity stats');
    }
  }
};

module.exports = CMReportModel;