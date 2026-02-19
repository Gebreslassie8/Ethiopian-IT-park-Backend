const db = require("../Config/db");
const { format } = require("date-fns");


const EXTERNAL_USER_ID = 26;
exports.createContent = async (data, conn) => {
  const sql = `INSERT INTO content
    (title, description, file_url, file_format, uploaded_date, access_level, author, preview_path, preview_type, download_count, view_count, category_id, file_size) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const values = [
    data.title,
    data.description,
    data.file_url,
    data.file_format,
    data.uploaded_date,
    data.access_level,
    data.author,
    data.preview_path,
    data.preview_type,
    data.download_count,
    data.view_count,
    data.category_id,
    data.file_size,
  ];

  const [result] = await conn.query(sql, values); // use the transaction connection
  return result.insertId;
};

exports.getCategoryByName = async (name) => {
  const [rows] = await db.query(
    "SELECT category_id FROM categories WHERE name = ?",
    [name]
  );
  return rows.length > 0 ? rows[0] : null;
};
exports.getCategoryById = async (category_id) => {
  const [rows] = await db.query(
    "Select name from categories where category_id = ?",
    [category_id]
  );
  return rows.length > 0 ? rows[0] : null;
};
// Controller function to get content by id
exports.getContentById = async (content_id) => {
  const sql = `
    SELECT 
      content.content_id,
      content.title,
      content.description,
      categories.name AS category,
      content.author,
      content.file_url,
      content.preview_path,
      content.access_level,
      GROUP_CONCAT(tags.tag_name) AS tag
    FROM content 
    JOIN categories ON content.category_id = categories.category_id
    LEFT JOIN content_tag ON content.content_id = content_tag.content_id
    LEFT JOIN tags ON content_tag.tag_id = tags.tag_id
    WHERE content.content_id = ? 
    GROUP BY content.content_id;
  `;

  const [rows] = await db.query(sql, [content_id]);
  if (rows.length === 0) return null;

  const content = rows[0];
  content.tags = content.tags ? content.tags.split(",") : [];

  return content;
};

exports.fetchContents = async () => {
  const [rows] = await db.query(`
    SELECT 
      content.content_id, 
      content.title, 
      content.description,
      content.category_id,
      categories.name AS category,
      content.author, 
      content.uploaded_date, 
      content.file_url,
      content.preview_path,
      content.preview_type,
      content.access_level,
      content.file_format,
      content.file_size,
      content.view_count AS views,
      content.download_count AS downloads,
      content.status,
      GROUP_CONCAT(tags.tag_name) AS tag
    FROM content
    LEFT JOIN categories ON content.category_id = categories.category_id
    LEFT JOIN content_tag ON content.content_id = content_tag.content_id
    LEFT JOIN tags ON content_tag.tag_id = tags.tag_id
    WHERE content.status = 'active'
    GROUP BY content.content_id
  `);

  return rows.map((row) => ({
    ...row,
    uploaded_date: format(new Date(row.uploaded_date), "MMMM d, yyyy, h:mm a"),
    tag: row.tag ? row.tag.split(",") : [], // return tags as array
  }));
};
exports.fetchExternalContents = async () => {
  const [rows] = await db.query(`
    SELECT 
      content.content_id, 
      content.title, 
      content.description,
      content.category_id,
      categories.name AS category,
      content.author, 
      content.uploaded_date, 
      content.file_url,
      content.preview_path,
      content.preview_type,
      content.view_count AS views,
      content.download_count AS downloads,
      content.access_level,
      content.file_format,
       content.file_size,
      content.status,
      GROUP_CONCAT(tags.tag_name) AS tag
    FROM content
    LEFT JOIN categories ON content.category_id = categories.category_id
    LEFT JOIN content_tag ON content.content_id = content_tag.content_id
    LEFT JOIN tags ON content_tag.tag_id = tags.tag_id
    WHERE content.status = 'active' AND content.access_level = 'externaluser'
    GROUP BY content.content_id
  `);

  return rows.map((row) => ({
    ...row,
    uploaded_date: format(new Date(row.uploaded_date), "MMMM d, yyyy, h:mm a"),
    tag: row.tag ? row.tag.split(",") : [],
  }));
};

exports.updateViewCount = async (content_id) => {
  return db.query(
    "UPDATE content SET view_count = view_count + 1 WHERE content_id = ?",
    [content_id]
  );
};

exports.updateDownloadCount = async (content_id) => {
  return db.query(
    "UPDATE content SET download_count = download_count + 1 WHERE content_id = ?",
    [content_id]
  );
};

exports.logInteraction = async (user_id, content_id, action_type) => {
  // Set default durations (in seconds)
  const durations = {
    view: 30, // 30 sec = avg time spent viewing
    download: 10, // 10 sec = avg time for download action
  };

  // Validate content exists
  const [contentRows] = await db.query(
    "SELECT content_id FROM content WHERE content_id = ?",
    [content_id]
  );
  if (contentRows.length === 0) {
    throw new Error(`Content ID ${content_id} not found`);
  }

  // Insert interaction (auto-set duration + current timestamp)
  await db.query(
    `INSERT INTO content_user_interaction 
     (user_id, content_id, interaction_time, duration, action_type) 
     VALUES (?, ?, NOW(), ?, ?)`,
    [
      user_id || EXTERNAL_USER_ID, // fallback to default user
      content_id,
      durations[action_type] || 0, // default to 0 if invalid type
      action_type, // 'view' or 'download'
    ]
  );
};

exports.updateContent = async (content_id, data) => {
  const sql = `UPDATE content 
  SET title = ?, description = ?, access_level = ?, category_id = ?, author = ?, file_url = COALESCE(?, file_url), preview_path = COALESCE(?, preview_path)
  WHERE content_id = ?`;

  const values = [
    data.title,
    data.description,
    data.access_level,
    data.category_id,
    data.author || null,
    data.file_url || null,
    data.preview_path || null,
    content_id,
  ];

  await db.query(sql, values);

  // Update tags as before...
  if (Array.isArray(data.tags)) {
    await db.query(`DELETE FROM content_tag WHERE content_id = ?`, [
      content_id,
    ]);

    for (const tag of data.tags) {
      const [tagRows] = await db.query(
        `SELECT tag_id FROM tags WHERE tag_name = ?`,
        [tag]
      );
      let tag_id;

      if (tagRows.length > 0) {
        tag_id = tagRows[0].tag_id;
      } else {
        const [tagInsert] = await db.query(
          `INSERT INTO tags (tag_name) VALUES (?)`,
          [tag]
        );
        tag_id = tagInsert.insertId;
      }

      await db.query(
        `INSERT INTO content_tag (content_id, tag_id) VALUES (?, ?)`,
        [content_id, tag_id]
      );
    }
  }

  return { message: "Content updated successfully" };
};

exports.deleteContent = async (content_id) => {
  const sql = `DELETE FROM content WHERE content_id = ?`;
  const [result] = await db.query(sql, [content_id]);
  return result;
};

exports.getMostViewedContents = async () => {
  const [rows] = await db.query(`
    SELECT categories.name AS category_name, 
           SUM(COALESCE(view_count, 0)) as total_views
    FROM content
    LEFT JOIN categories ON content.category_id = categories.category_id
    WHERE content.status = 'active'
    GROUP BY categories.name
    ORDER BY total_views DESC
    LIMIT 5
  `);
  return rows;
};

exports.getTagByName = async (tagName, connection) => {
  const [rows] = await connection.query(
    "SELECT * FROM tags WHERE tag_name = ?",
    [tagName]
  );
  return rows[0];
};

exports.createTag = async (tagName, connection) => {
  const [result] = await connection.query(
    "INSERT INTO tags (tag_name) VALUES (?)",
    [tagName]
  );
  return result.insertId;
};

exports.linkContentTag = async (contentId, tagId, connection) => {
  await connection.query(
    "INSERT INTO content_tag (content_id, tag_id) VALUES (?, ?)",
    [contentId, tagId]
  );
};
exports.getContentByTitleAndAuthor = async (title, author) => {
  const [rows] = await db.query(
    "SELECT * FROM content WHERE title = ? AND author = ? AND status = 'active'",
    [title, author]
  );
  return rows[0]; // If exists
};


exports.archiveAContent = async (content_id) => {
  const [rows] = await db.query(`SELECT * FROM content WHERE content_id = ?`, [
    content_id,
  ]);
  if (rows.length === 0) throw new Error("Content not found");

  await db.query(
    `UPDATE content SET status = 'archived' WHERE content_id = ?`,
    [content_id]
  );
  return { message: "Content archived successfully" };
};

exports.restoreAContent = async (content_id) => {
  const [rows] = await db.query(`SELECT * FROM content WHERE content_id = ?`, [
    content_id,
  ]);
  if (rows.length === 0) throw new Error("Archived content not found");

  await db.query(`UPDATE content SET status = 'active' WHERE content_id = ?`, [
    content_id,
  ]);
  return { message: "Content restored successfully" };
};

exports.getArchivedContents = async ({ search, accessLevel, categoryIds, sortOrder }) => {
  let sql = `
    SELECT 
      content.*, categories.name AS category,
      GROUP_CONCAT(tags.tag_name) AS tag
    FROM content
    LEFT JOIN categories ON content.category_id = categories.category_id
    LEFT JOIN content_tag ON content.content_id = content_tag.content_id
    LEFT JOIN tags ON content_tag.tag_id = tags.tag_id
    WHERE content.status = 'archived'
  `;

  const params = [];

  if (search) {
    sql += ` AND (
      content.title LIKE ? OR 
      content.description LIKE ? OR 
      content.author LIKE ? OR
      tags.tag_name LIKE ? OR
      categories.name LIKE ?
    )`;
    const searchValue = `%${search}%`;
    params.push(searchValue, searchValue, searchValue, searchValue, searchValue);
  }

  if (accessLevel && accessLevel !== "all") {
    sql += ` AND content.access_level = ?`;
    params.push(accessLevel);
  }

  if (categoryIds && categoryIds.length > 0) {
    const placeholders = categoryIds.map(() => "?").join(", ");
    sql += ` AND content.category_id IN (${placeholders})`;
    params.push(...categoryIds);
  }

  sql += ` GROUP BY content.content_id`;

  if (sortOrder === "oldest") {
    sql += ` ORDER BY content.uploaded_date ASC`;
  } else {
    sql += ` ORDER BY content.uploaded_date DESC`;
  }

  const [rows] = await db.query(sql, params);

  return rows.map((row) => ({
    ...row,
    tag: row.tag ? row.tag.split(",") : [],
    uploaded_date: format(new Date(row.uploaded_date), "MMMM d, yyyy, h:mm a"),
  }));
};



exports.getAccessLevelByPreviewFilename = async (filename) => {
  const [rows] = await db.query(
    "SELECT access_level FROM content WHERE preview_path LIKE ? LIMIT 1",
    [`%${filename}`]
  );
  return rows.length > 0 ? rows[0].access_level : null;
};


exports.searchAndFilterContents = async ({ search, accessLevel, categoryIds, sortOrder }) => {
  let sql = `
    SELECT 
      content.*, categories.name AS category,
      GROUP_CONCAT(tags.tag_name) AS tag
    FROM content
    LEFT JOIN categories ON content.category_id = categories.category_id
    LEFT JOIN content_tag ON content.content_id = content_tag.content_id
    LEFT JOIN tags ON content_tag.tag_id = tags.tag_id
    WHERE content.status = 'active'
  `;

  const params = [];

  if (search) {
    sql += ` AND (
      content.title LIKE ? OR 
      content.description LIKE ? OR 
      content.author LIKE ? OR
      tags.tag_name LIKE ? OR
      categories.name LIKE ?
    )`;
    const searchValue = `%${search}%`;
    params.push(searchValue, searchValue, searchValue, searchValue, searchValue);
  }

  if (accessLevel && accessLevel !== "all") {
    sql += ` AND content.access_level = ?`;
    params.push(accessLevel);
  }

  if (categoryIds && categoryIds.length > 0) {
    const placeholders = categoryIds.map(() => "?").join(", ");
    sql += ` AND content.category_id IN (${placeholders})`;
    params.push(...categoryIds);
  }

  sql += ` GROUP BY content.content_id`;

  if (sortOrder === "oldest") {
    sql += ` ORDER BY content.uploaded_date ASC`;
  } else {
    sql += ` ORDER BY content.uploaded_date DESC`;
  }

  const [rows] = await db.query(sql, params);

  return rows.map((row) => ({
    ...row,
    tag: row.tag ? row.tag.split(",") : [],
    uploaded_date: format(new Date(row.uploaded_date), "MMMM d, yyyy, h:mm a"),
  }));
};

exports.getRelatedContentsByTags = async (contentId, accessLevel = "externaluser") => {
  const [tagRows] = await db.query(
    `SELECT tag_id FROM content_tag WHERE content_id = ?`,
    [contentId]
  );

  if (tagRows.length === 0) return [];

  const tagIds = tagRows.map(row => row.tag_id);

  const [related] = await db.query(`
    SELECT c.* FROM content c
    JOIN content_tag ct ON c.content_id = ct.content_id
    WHERE ct.tag_id IN (?) AND c.content_id != ?
    AND c.access_level = ?
    GROUP BY c.content_id
    ORDER BY c.view_count DESC
    LIMIT 4
  `, [tagIds, contentId, accessLevel]);

  return related;
};
