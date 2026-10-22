const db = require('../Config/db.js'); // assuming you use mysql2/promise
const { format } = require('date-fns');
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { updateUserById, deleteUserById ,fetchAllUsers, getFilteredUser,updateUserProfile ,getUserById,
  getUserProfileById,updateUserProfilePicture
} =require('../Models/userModel.js');
const getAllUsers = async (req, res) => {
  try {
    const rows = await fetchAllUsers();

    const now = new Date();
    const users = rows.map(user => {
      const lastLogin = user.last_login ? new Date(user.last_login) : null;
      const isActive = lastLogin && (now - lastLogin) / (1000 * 60 * 60 * 24) < 30;

      return {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: format(new Date(user.created_at), "MMMM d, yyyy, h:mm a"),
        status: isActive ? "Active" : "Inactive"
      };
    });

    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
};


// Edit user
const editUser = async (req, res) => {
  const { user_id } = req.params;
  const { username, email, role } = req.body;

  try {
    const result = await updateUserById(user_id, { username, email, role });
    res.status(200).json({ message: "User updated successfully", user: result });
  } catch (err) {
    console.error("Edit user error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  const { user_id } = req.params;

  try {
    await deleteUserById(user_id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

const getUserProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized: No user in request" });
    }
    const user_id = req.user.user_id;

    if (!user_id) {
      console.error("DEBUG: user_id is missing from req.user!");
      return res.status(401).json({ success: false, message: "Unauthorized: No user_id in token" });
    }

    const user = await getUserProfileById(user_id);

    if (!user) {
      console.error("DEBUG: No user found in DB for user_id", user_id);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateProfilePicture = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    // Get existing user data
    const userData = await getUserById(user_id);
    if (!userData) return res.status(404).json({ success: false, message: "User not found" });

    // Save new image
    const uploadsDir = path.join(__dirname, "..", "uploads", "profile");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const uniqueName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, "")}`;
    const newPath = path.join(uploadsDir, uniqueName);
    fs.writeFileSync(newPath, req.file.buffer);
    const profile_picture = `uploads/profile/${uniqueName}`;

    // Delete old image (if exists)
    if (userData.profile_picture) {
      const oldPath = path.join(__dirname, "..", userData.profile_picture);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await updateUserProfilePicture(user_id, profile_picture);

    res.json({ success: true, profile_picture });
  } catch (err) {
    console.error("Profile picture upload error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { username, email } = req.body;

    // Create a dynamic schema based on provided fields
    const dynamicSchema = ValidationSchema.pick({
      username: username !== undefined,
      email: email !== undefined,
    });

    // Validate incoming data with the dynamic schema
    await dynamicSchema.validate({ username, email });

    // Get existing user data
    const [userData] = await getUserById(user_id);
    if (!userData) return res.status(404).json({ success: false, message: "User not found" });

    let profile_picture = userData.profile_picture;

    // Handle new image
    if (req.file) {
      const uploadsDir = path.join(__dirname, "..", "uploads", "profile");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Save new image
      const uniqueName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, "")}`;
      const newPath = path.join(uploadsDir, uniqueName);
      fs.writeFileSync(newPath, req.file.buffer);
      profile_picture = `/uploads/profile/${uniqueName}`;

      // Delete old image (if exists)
      if (userData.profile_picture) {
        const oldPath = path.join(__dirname, "..", userData.profile_picture);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    const result = await updateUserProfile(user_id, {
      username,
      email,
      profile_picture,
    });

    if (result.affectedRows > 0) {
      return res.json({ success: true, message: "Profile updated successfully" });
    } else {
      return res.status(400).json({ success: false, message: "Update failed" });
    }
  } catch (err) {
    console.error("Update profile error:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getFilteredUsers = async (req, res) => {
  const { search = "", status = "" } = req.query;

  try {
    const users = await getFilteredUser(search, status);
    res.json(users);
  } catch (err) {
    console.error("Error fetching filtered users:", err);
    res.status(500).json({ message: "Server error" });
  }
};




module.exports = { getAllUsers ,editUser ,deleteUser ,updateProfile ,getUserProfile,updateProfilePicture,getFilteredUsers};