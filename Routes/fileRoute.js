const express = require("express");
const router = express.Router();
const { serveProfilePicture ,servePreview } = require("../Controllers/fileController");
const { optionalAuthMiddleware } = require("../Middlewares/authMiddleware");

router.get("/profile-picture/:filename", serveProfilePicture);
router.get("/preview/:filename", optionalAuthMiddleware, servePreview); 


module.exports = router;
