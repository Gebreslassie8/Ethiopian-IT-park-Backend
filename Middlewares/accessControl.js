// middlewares/accessControl.js
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const db = require('../Config/db');

const restrictInternalAccess = async (req, res, next) => {
  const contentId = req.params.content_id || req.query.content_id;

  try {
    const [rows] = await db.query("SELECT access_level FROM content WHERE content_id = ?", [contentId]);
    if (rows.length === 0) return res.status(404).json({ message: "Content not found" });

    const { access_level } = rows[0];

    if (access_level === 'external') {
      return next(); // Public access
    }   

    // Internal access requires authentication
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Authentication required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Allow only admin (1) or content manager (2)
    if (![1, 2].includes(decoded.role_id)) {
      return res.status(403).json({ message: "Forbidden: Not authorized for internal content" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error("Access control error:", err);
    res.status(500).json({ message: "Server error while checking access" });
  }
};

module.exports = { restrictInternalAccess };
