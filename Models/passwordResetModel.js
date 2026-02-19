const db = require("../Config/db");
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // Not used here, can remove unless planning future use

// Generate a 6-digit numeric OTP
function generateResetToken() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create or update token for the user
async function createOrUpdateResetToken(email, token, expiresAt) {
  const [userRows] = await db.execute(
    "SELECT user_id FROM users WHERE email = ?",
    [email]
  );

  if (userRows.length === 0) return null;  // No user with this email

  const userId = userRows[0].user_id;

  const [existing] = await db.execute(
    "SELECT reset_id FROM password_reset WHERE user_id = ?",
    [userId]
  );

  if (existing.length > 0) {
    // Update existing token and expiry
    await db.execute(
      "UPDATE password_reset SET reset_token = ?, expires_at = ? WHERE user_id = ?",
      [token, expiresAt, userId]
    );
    return existing[0].reset_id;
  } else {
    // Insert new token
    const [result] = await db.execute(
      "INSERT INTO password_reset (user_id, reset_token, expires_at) VALUES (?, ?, ?)",
      [userId, token, expiresAt]
    );
    return result.insertId;
  }
}

// Verify OTP with email
async function verifyOtp(email, otp) {
  const [rows] = await db.execute(
    `SELECT pr.* FROM password_reset pr
     JOIN users u ON pr.user_id = u.user_id
     WHERE u.email = ? AND pr.reset_token = ? AND pr.expires_at > NOW()`,
    [email, otp]
  );
  return rows.length > 0;
}

// Update password and expire OTP
async function updatePassword(email, newPassword) {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  const [user] = await db.execute(
    "SELECT user_id FROM users WHERE email = ?",
    [email]
  );

  if (user.length === 0) return false;  // No user found

  const userId = user[0].user_id;

  await db.execute(
    "UPDATE users SET password = ? WHERE email = ?",
    [hashedPassword, email]
  );

  // Expire the OTP by setting expires_at to NOW()
  await db.execute(
    "UPDATE password_reset SET expires_at = NOW() WHERE user_id = ?",
    [userId]
  );

  return true;
}

// Invalidate token manually by reset ID
async function invalidateToken(resetId) {
  await db.execute(
    "UPDATE password_reset SET expires_at = NOW() WHERE reset_id = ?",
    [resetId]
  );
}

module.exports = {
  generateResetToken,
  createOrUpdateResetToken,
  verifyOtp,
  updatePassword,
  invalidateToken,
};
