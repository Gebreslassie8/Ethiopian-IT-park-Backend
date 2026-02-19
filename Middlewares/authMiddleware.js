const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const authMiddleware = (req, res, next) => {
   console.log("Authorization header:", req.headers.authorization); 
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECERET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user || !allowedRoles.includes(user.role_id)) {
      return res.status(403).json({ message: "Unauthorized role" });
    }
    next();
  };
};

const optionalAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next(); // No token — treat as guest

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECERET);
    req.user = decoded;
  } catch (err) {
    // Invalid token — treat as guest (but don't crash)
    req.user = null;
  }
  next();
};

module.exports = { authMiddleware, roleMiddleware ,optionalAuthMiddleware};
