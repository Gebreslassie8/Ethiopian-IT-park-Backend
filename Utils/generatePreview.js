const fs = require("fs-extra");
const path = require("path");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const mime = require("mime-types");
const puppeteer = require("puppeteer");

// Configure FFmpeg and FFprobe paths
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const FALLBACK_IMAGE_PATH = path.join(__dirname, "../assets/PreviewUnsupported.jpg");

// Ensure preview directory exists
const PREVIEW_DIR = path.join(__dirname, "../uploads/previews");
fs.ensureDirSync(PREVIEW_DIR);

// Main preview generator
const generatePreview = async (filePath, originalName, mimeType) => {
  const ext = mime.extension(mimeType);
  const baseName = path.parse(originalName).name;
  const previewFilename = `${baseName}_preview.jpg`;
  const previewPath = path.join(PREVIEW_DIR, previewFilename);

  // Image preview
  if (mimeType.startsWith("image/")) {
    await sharp(filePath)
      .resize(300)
      .jpeg({ quality: 80 })
      .toFile(previewPath);      
    return { path: previewPath, type: "image" };
  }

  // Video preview
  if (mimeType.startsWith("video/")) {
    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .screenshots({
          timestamps: ["50%"],
          filename: previewFilename,
          folder: PREVIEW_DIR,
          size: "320x240",
        })
        .on("end", () => resolve({ path: previewPath, type: "video" }))
        .on("error", reject);
    });
  }

  // PDF preview using Puppeteer (real rendering)
  if (mimeType === "application/pdf") {
    try {
      const tempHtmlPath = `file://${filePath}`;
      const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
      const page = await browser.newPage();

      await page.goto(tempHtmlPath, { waitUntil: "networkidle0" });

      // Set viewport to match a page size
      await page.setViewport({ width: 1000, height: 1414 }); // A4 ratio

      // Screenshot only the visible first page
      const screenshotBuffer = await page.screenshot({ type: "jpeg", quality: 80 });

      await browser.close();

      // Resize and save as preview
      await sharp(screenshotBuffer).resize(300).toFile(previewPath);
      return { path: previewPath, type: "pdf" };
    } catch (err) {
      console.error("PDF preview error (puppeteer):", err);
      return { path: null, type: "pdf", error: err.message };
    }
  }

  // Text file preview
  if (mimeType.startsWith("text/")) {
    const text = await fs.readFile(filePath, "utf8");
    const previewText = text.substring(0, 300) + (text.length > 300 ? "..." : "");
    const previewTextPath = path.join(PREVIEW_DIR, `${baseName}_preview.txt`);
    await fs.writeFile(previewTextPath, previewText);
    return { path: previewTextPath, type: "text" };
  }
      
  // Unsupported
  return { path: FALLBACK_IMAGE_PATH, type: "unsupported" };
};

module.exports = generatePreview;