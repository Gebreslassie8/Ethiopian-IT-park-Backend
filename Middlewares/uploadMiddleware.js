const multer = require("multer");

// Use memoryStorage so we can manually control when to save files
const storage = multer.memoryStorage();

const upload = multer({ storage });

module.exports = upload;
