const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser, findUserByEmail, getRoleIdByName, updateLastLogin } = require('../Models/userModel');
const dotenv = require('dotenv');
dotenv.config();

const register = async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const role_id = await getRoleIdByName(role.toLowerCase());
    if (!role_id) return res.status(400).json({ message: `Invalid role: ${role}` });

    await createUser(username, email, hashedPassword, role_id);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const login = async (req, res) => {
  const { email, password} = req.body;

  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    await updateLastLogin(email);

    const token = jwt.sign(
      { user_id: user.user_id, role_id: user.role_id },
      process.env.JWT_SECERET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        role_id: user.role_id,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { register, login };
