const express = require('express');
const router = express.Router();
const { login, register } = require('../Controllers/authControllers');
const { getAllUsers ,editUser ,deleteUser,updateProfile,getUserProfile,updateProfilePicture,getFilteredUsers} = require( '../Controllers/userControllers.js');
const { authMiddleware } = require("../Middlewares/authMiddleware");
const upload = require("../Middlewares/uploadMiddleware"); 


router.post('/register', register);
router.post('/login', login);
router.get('/users', getAllUsers);
router.get("/filter", getFilteredUsers);


router.put('/edit/:user_id', editUser);
router.delete('/delete/:user_id', deleteUser);
router.put("/profile", authMiddleware, upload.single("profileImage"), updateProfile);
router.put(
  "/profile-picture",
  authMiddleware,
  upload.single("profileImage"),
  updateProfilePicture
);
router.get("/profile", authMiddleware, getUserProfile);
module.exports = router;
