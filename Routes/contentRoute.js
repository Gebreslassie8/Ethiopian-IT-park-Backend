const express = require("express");
const router = express.Router();
const upload = require("../Middlewares/uploadMiddleware");
const {authMiddleware,optionalAuthMiddleware} = require("../Middlewares/authMiddleware");
const { uploadContent, getContents ,editContent,deleteContent,fetchMostViewedContents,
     getContent,  downloadContent,archiveContent,getArchivedContents,restoreContent,
     getExternalContents,viewContent,searchFilteredContents,getRelatedContents} = require("../Controllers/contentController");

router.post("/upload", upload.single("file"),authMiddleware, uploadContent);
router.get("/contents",authMiddleware, getContents);
router.get("/contents/external", getExternalContents);

router.get('/most-viewed',authMiddleware,fetchMostViewedContents);
router.get('/edit/:content_id',authMiddleware,getContent);
router.put('/edit/:content_id',authMiddleware, upload.single('file'), editContent);
router.delete('/delete/:content_id',authMiddleware, deleteContent);

router.patch('/archive/:content_id',authMiddleware,archiveContent);
router.patch('/restore/:content_id',authMiddleware,restoreContent);
router.get('/archived',authMiddleware,getArchivedContents);

router.get('/:content_id/view', optionalAuthMiddleware,viewContent);
router.get('/:content_id/download',optionalAuthMiddleware,downloadContent);

router.get("/search", optionalAuthMiddleware, searchFilteredContents);

router.get("/related", getRelatedContents); // for external
router.get("/related/internal", authMiddleware, getRelatedContents);



module.exports = router;
