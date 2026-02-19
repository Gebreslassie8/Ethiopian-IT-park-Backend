const fs = require("fs");
const path = require("path");
const db = require("../Config/db");
const {
  createContent,
  getCategoryByName,
  fetchContents,
  updateContent,
  deleteContent,
  getContentById,
  getMostViewedContents,
  getTagByName,
  createTag,
  linkContentTag,
  getContentByTitleAndAuthor,
  archiveAContent,
  restoreAContent,
  getArchivedContents,
  fetchExternalContents,
  updateViewCount,
  updateDownloadCount,
  logInteraction,
searchAndFilterContents,
getRelatedContentsByTags
} = require("../Models/contentModel");
const generatePreview = require("../Utils/generatePreview"); // Adjust path if needed
const util = require('util');
const unlink = util.promisify(fs.unlink);
const external_user_id = 26;

const handleFileUpload = (file) => {
  const uploadDir = path.join(__dirname, "../uploads/actualFiles");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  const filePath = path.join(uploadDir, file.originalname);
  if (fs.existsSync(filePath)) {
    throw new Error("A file with the same name already exists.");
  }

  fs.writeFileSync(filePath, file.buffer);
  return {
    filePath,
    fileUrl: path.relative(__dirname, filePath),
    fileFormat: path.extname(file.originalname),
    previewType: file.mimetype,
    fileSize: file.size,
  };
};

async function deleteFileIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      await unlink(filePath);
      console.log(`Deleted file: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error.message);
  }
}
exports.uploadContent = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { file } = req;
    const { title, description, access_level, contentCreator, category, tag } = req.body;

    if (!file || !title || !contentCreator || !category) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const existing = await getContentByTitleAndAuthor(title, contentCreator);
    if (existing) {
      return res.status(409).json({ error: "Content with this title and author already exists." });
    }

    const categoryData = await getCategoryByName(category.trim());
    if (!categoryData) {
      return res.status(400).json({ error: "Invalid category." });
    }

    // Save original file
    const { filePath, fileUrl, fileFormat, previewType, fileSize } = handleFileUpload(file);

    //  Generate preview
    const { path: previewPath, type: previewGeneratedType } = await generatePreview(
      filePath,
      file.originalname,
      file.mimetype
    );

    const relativePreviewPath = previewPath ? path.relative(path.join(__dirname, ".."), previewPath) : null;

    const contentData = {
      title,
      description,
      file_url: fileUrl,
      file_format: fileFormat,
      uploaded_date: new Date(),
      access_level,
      author: contentCreator,
      preview_path: relativePreviewPath,
      preview_type: previewGeneratedType,
      download_count: 0,
      view_count: 0,
      category_id: categoryData.category_id,
      file_size: fileSize,
    };

    await connection.beginTransaction();
    const contentId = await createContent(contentData, connection);

    // Process tags if provided
    if (tag) {
      const tags = Array.isArray(tag)
        ? tag
        : tag.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);

      for (const tagName of tags) {
        let tagRecord = await getTagByName(tagName, connection);
        let tagId = tagRecord?.tag_id || await createTag(tagName, connection);
        await linkContentTag(contentId, tagId, connection);
      }
    }

    await connection.commit();
    res.status(201).json({ message: "Content uploaded successfully." });

  } catch (error) {
    await connection.rollback();
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload content." });
  } finally {
    connection.release();
  }
};


exports.getContents = async (req, res) => {
  try {
    const contents = await fetchContents();
    res.status(200).json(contents);
  } catch (error) {
    console.error("Fetch contents error:", error);
    res.status(500).json({ error: "Server Error" });
  }
};
exports.getExternalContents = async (req, res) => {
  try {
    const contents = await fetchExternalContents();
    res.status(200).json(contents);
  } catch (error) {
    console.error("Fetch external contents error:", error);
    res.status(500).json({ error: "Server Error" });
  }
};


exports.getContent = async (req, res) => {
  try {
    const { content_id } = req.params;
    const content = await getContentById(content_id);

    if (!content) return res.status(404).json({ error: 'Content not found' });

    res.json(content);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.editContent = async (req, res) => {
  try {
    const { content_id } = req.params;
    const { title, tag, description, access_level, category, contentCreator } = req.body;

    if (!content_id) {
      return res.status(400).json({ error: "Content ID is required" });
    }

    if (!req.body) {
      return res.status(400).json({ error: "Request body is missing" });
    }

    const categoryData = await getCategoryByName(category?.trim());
    if (!categoryData) {
      return res.status(400).json({ error: "Invalid category name" });
    }

    if (!access_level) {
      return res.status(400).json({ error: "Access level is required" });
    }

    let tagsArray = [];
    if (tag) {
      tagsArray = Array.isArray(tag)
        ? tag
        : tag.split(",").map(t => t.trim()).filter(t => t.length > 0);
    }

    const updatedContentData = {
      title,
      tags: tagsArray,
      description,
      access_level,
      category_id: categoryData.category_id,
      author: contentCreator,
    };

    if (req.file) {
      const oldContent = await getContentById(content_id);
if (oldContent) {
  // Delete old actual file
  if (oldContent.file_url) {
    const oldFilePath = path.join(__dirname, "../uploads/actualFiles", path.basename(oldContent.file_url));
    deleteFileIfExists(oldFilePath);
  }

  // Delete old preview file
  if (oldContent.preview_path) {
    
  const previewFilename = path.basename(oldContent.preview_path); // includes the _preview part
  const oldPreviewPath = path.join(__dirname, "../uploads/previews", previewFilename);
  deleteFileIfExists(oldPreviewPath);
}

}


      const { filePath, fileUrl, fileFormat, previewType, fileSize } = handleFileUpload(req.file);

      const { path: previewPath, type: previewGeneratedType } = await generatePreview(
        filePath,
        req.file.originalname,
        req.file.mimetype
      );

      const relativePreviewPath = previewPath ? path.relative(path.join(__dirname, ".."), previewPath) : null;

      updatedContentData.file_url = fileUrl;
      updatedContentData.file_format = fileFormat;
      updatedContentData.preview_path = relativePreviewPath;
      updatedContentData.preview_type = previewGeneratedType;
      updatedContentData.file_size = fileSize;
    }

    await updateContent(content_id, updatedContentData);

    res.status(200).json({ message: "Content updated successfully" });
  } catch (error) {
    console.error("Edit content error:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

exports.deleteContent = async (req, res) => {
  try {
    const { content_id } = req.params;

    const content = await getContentById(content_id);
    if (!content) {
      return res.status(404).json({ error: "Content not found" });
    }

    const baseDirectory = path.join(__dirname, '../uploads');

    // Delete actual file
    const absoluteFilePath = path.join(baseDirectory, content.file_url);
    await deleteFileIfExists(absoluteFilePath);

    // Delete preview file
    if (content.preview_path) {
      const previewFilename = path.basename(content.preview_path);
      const previewFilePath = path.join(baseDirectory, 'previews', previewFilename);
      await deleteFileIfExists(previewFilePath);
    }

    const result = await deleteContent(content_id);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Content not found in DB" });
    }

    res.status(200).json({ message: "Content and preview deleted successfully" });
  } catch (error) {
    console.error("Delete content error:", error);
    res.status(500).json({ error: "Server Error" });
  }
};

exports.fetchMostViewedContents = async (req, res) => {
  try {
    const mostViewedContents = await getMostViewedContents();

    const formatted = mostViewedContents.map(item => ({
      category: item.category_name,
      views: Number(item.total_views),
    }));

    res.json(formatted);
  } catch (error) {
    console.error("ERROR in fetchMostViewedContents:", error.message);
    res.status(500).json({ error: 'Failed to fetch most viewed contents' });
  }
};


exports.archiveContent = async (req, res) => {
  try {
    const { content_id } = req.params;
    const result = await archiveAContent(content_id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.restoreContent = async (req, res) => {
  try {
    const { content_id } = req.params;
    const result = await restoreAContent(content_id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getArchivedContents = async (req, res) => {
  try {
    const { search = "", accessLevel, categoryIds = "[]", sortOrder = "newest" } = req.query;
    const categoryIdArray = JSON.parse(categoryIds);

    const contents = await getArchivedContents({
      search,
      accessLevel,
      categoryIds: categoryIdArray,
      sortOrder,
    });

    res.status(200).json(contents);
  } catch (error) {
    console.error("Error fetching archived contents:", error);
    res.status(500).json({ error: error.message });
  }
};


//  Shared Access Check
function isAccessDenied(content, user) {
  const isInternalOnly = content.access_level === "internaluser";
  if (isInternalOnly && !user) return { status: 401, message: "Login required" };
  if (isInternalOnly && user.role === "externaluser") return { status: 403, message: "Access denied" };
  return null;
}

//  View Content
exports.viewContent = async (req, res) => {
  const { content_id } = req.params;
  const user_id = req.user?.user_id ?? external_user_id;

  try {
    if (!content_id) return res.status(400).json({ error: "Content ID is required" });

    const content = await getContentById(content_id);
    if (!content) return res.status(404).json({ error: "Content not found" });

    //  Enforce strict access control
    const accessIssue = isAccessDenied(content, req.user);
    if (accessIssue) return res.status(accessIssue.status).json({ message: accessIssue.message });

    const filePath = path.resolve("uploads", content.file_url);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });

    await updateViewCount(content_id);
    await logInteraction(user_id, content_id, "view");

    // Detect video file by mimetype or extension
    const videoMimeTypes = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    const ext = path.extname(filePath).toLowerCase();

    if (videoMimeTypes.includes(ext)) {
      // Stream video with range support
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (!range) {
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type": `video/${ext.replace('.', '')}`,
        });
        fs.createReadStream(filePath).pipe(res);
      } else {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": `video/${ext.replace('.', '')}`,
        });
        file.pipe(res);
      }
      return;
    }

    
    // For non-video files, fallback to sendFile (images, pdf, etc.)
    res.sendFile(filePath);
  } catch (error) {
    console.error("View error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
//  Download Content
exports.downloadContent = async (req, res) => {
  const { content_id } = req.params;
  const user_id = req.user?.user_id ?? external_user_id;

  try {
    if (!content_id) return res.status(400).json({ error: "Content ID is required" });

    const content = await getContentById(content_id);
    if (!content) return res.status(404).json({ error: "Content not found" });

    const accessIssue = isAccessDenied(content, req.user);
    if (accessIssue) return res.status(accessIssue.status).json({ message: accessIssue.message });

    const filePath = path.resolve("uploads", content.file_url);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });

    await updateDownloadCount(content_id);
    await logInteraction(user_id, content_id, "download");

    res.download(filePath, content.file_url);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};



exports.searchFilteredContents = async (req, res) => {
  const { search = "", category = "", accessLevel, sortOrder = "newest" } = req.query;
  const user = req.user || null; // from optionalAuthMiddleware

  // Determine user role
  const isExternalUser = !user || user.role === "externaluser";

  // Access control rules
  if (accessLevel === "internaluser") {
    if (!user) {
      return res.status(401).json({ message: "Unauthorized: Please log in to access internal content" });
    }
    if (user.role === "externaluser") {
      return res.status(403).json({ message: "Forbidden: External users cannot access internal content" });
    }
  }

  // Only allow "externaluser" access to external contents
  const filters = {
    search,
    accessLevel: accessLevel || (isExternalUser ? "externaluser" : null),
    categoryIds: category ? category.split(",") : [],
    sortOrder, // Add sortOrder to the filters
  };

  try {
    const results = await searchAndFilterContents(filters);
    res.json(results);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Failed to search contents" });
  }
};




exports.getRelatedContents = async (req, res) => {
  const contentId = req.query.for;
  const isInternal = req.path.includes("internaluser");

  if (!contentId) return res.status(400).json({ message: "Missing content ID" });

  try {
    const contents = await getRelatedContentsByTags(contentId, isInternal ? "internaluser" : "externaluser");
    res.json(contents);
  } catch (err) {
    console.error("Error fetching related contents:", err);
    res.status(500).json({ message: "Server error" });
  }
};



