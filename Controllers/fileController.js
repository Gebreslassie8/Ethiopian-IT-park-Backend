const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
const db = require("../Config/db"); 
const { getAccessLevelByPreviewFilename } = require("../Models/contentModel");


exports.serveProfilePicture = (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "..", "uploads", "profile", filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Image not found" });
  }

  // Get extension and map to MIME type (basic built-in)
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };

  const contentType = mimeTypes[ext] || "application/octet-stream";

  res.set({
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*", // Add CORS header
    "Cache-Control": "public, max-age=86400", // Optional: cache for 1 day
  });

res.sendFile(filePath, (err) => {
  if (err && err.code !== 'ECONNABORTED') {
    console.error("Error sending profile picture:", err);
    res.status(500).json({ error: "Failed to send image" });
  }
  });
};



exports.servePreview = async (req, res) => {

  const filename = req.params.filename;
  const previewPath = path.join(__dirname, "..", "uploads", "previews", filename);

  if (!fs.existsSync(previewPath)) {
    return res.status(404).json({ error: "Preview not found" });
  }

  try {
    // Use the extracted model function
    const accessLevel = await getAccessLevelByPreviewFilename(filename);

    if (!accessLevel) {
      return res.status(404).json({ error: "Content not found for preview" });
    }

    if (accessLevel === "internaluser") {
      if (!req.user) {
        return res.status(401).json({ error: "Login required to view this preview" });
      }
      if (req.user.role !== "internaluser" && req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied: Internal users only" });
      }
    }

    res.setHeader("Content-Type", mime.lookup(previewPath) || "application/octet-stream");
    res.sendFile(previewPath);
  } catch (err) {
    console.error("Error serving preview:", err);
    res.status(500).json({ error: "Server error" });
  }
};