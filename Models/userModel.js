const db = require('../Config/db');

const createUser = async (username, email, hashedPassword, role_id) => {
  const sql = 'INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)';
  await db.execute(sql, [username, email, hashedPassword, role_id]);
};

const getRoleIdByName = async (roleName) => {
  const [rows] = await db.execute('SELECT role_id FROM roles WHERE role_name = ?', [roleName]);
  return rows[0]?.role_id;
};

const findUserByEmail = async (email) => {
  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0]; 
  } catch (err) {
    throw new Error('Error finding user: ' + err.message);
  }
};

const updateLastLogin = async (email) => {
  try {
    const query = "UPDATE users SET last_login = NOW() WHERE email = ?";
    await db.execute(query, [email]);
  } catch (error) {
    throw new Error("Error updating last login: " + error.message);
  }
};
const fetchAllUsers = async () => {
  const [rows] = await db.query(`
    SELECT user_id, username, email, created_at, last_login, roles.role_name AS role
    FROM users
    JOIN roles ON users.role_id = roles.role_id
  `);
  return rows;
};
// Update user
const updateUserById = async (user_id, { username, email, role }) => {
  const [roleData] = await db.query('SELECT role_id FROM roles WHERE role_name = ?', [role]);
  const role_id = roleData[0]?.role_id;

  await db.query(
    'UPDATE users SET username = ?, email = ?, role_id = ? WHERE user_id = ?',
    [username, email, role_id, user_id]
  );

  return { user_id, username, email, role };
};

// Delete user
const deleteUserById = async (user_id) => {
  await db.query('DELETE FROM users WHERE user_id = ?', [user_id]);
};

const getUserById = async (user_id) => {
  const [rows] = await db.query("SELECT * FROM users WHERE user_id = ?", [user_id]);
  return rows[0];
};

const getUserProfileById = async (user_id) => {
  const [rows] = await db.query(
    "SELECT user_id, username, email, profile_picture FROM users WHERE user_id = ?",
    [user_id]
  );
  return rows[0]; 
};
const updateUserProfilePicture = async (user_id, profile_picture) => {
  const [result] = await db.query(
    "UPDATE users SET profile_picture = ? WHERE user_id = ?",
    [profile_picture, user_id]
  );
  return result;
};


const updateUserProfile = async (user_id, { username, email, profile_picture }) => {
  const query = `
    UPDATE users
    SET username = ?, email = ?, profile_picture = ?
    WHERE user_id = ?
  `;
  const values = [username, email, profile_picture, user_id];

  const [result] = await db.query(query, values);
  return result;
};

// Add this to userModel.js
const getFilteredUser = async (search = "", status = "") => {
  let sql = `
    SELECT users.user_id, username, email, created_at, last_login, roles.role_name AS role
    FROM users
    JOIN roles ON users.role_id = roles.role_id
    WHERE 1=1
  `;

  const params = [];

  if (search) {
    sql += ` AND (username LIKE ? OR email LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term);
  }

  sql += ` ORDER BY users.created_at DESC`;

  const [rows] = await db.query(sql, params);

  // 💡 Add status calculation & filter
  const now = new Date();
  const filtered = rows
    .map((user) => {
      const lastLogin = user.last_login ? new Date(user.last_login) : null;
      const isActive = lastLogin && (now - lastLogin) / (1000 * 60 * 60 * 24) < 30;
      return {
        ...user,
        status: isActive ? "active" : "inactive",
      };
    })
    .filter((user) => {
      if (status === "active") return user.status === "active";
      if (status === "inactive") return user.status === "inactive";
      return true;
    });

  return filtered;
};


module.exports = { createUser, findUserByEmail ,getRoleIdByName,updateLastLogin,
  deleteUserById,updateUserById ,fetchAllUsers,getUserById,updateUserProfile,
  updateUserProfilePicture, getUserProfileById,getFilteredUser};
