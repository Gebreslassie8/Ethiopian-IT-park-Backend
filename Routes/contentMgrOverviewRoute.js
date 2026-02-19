const express = require("express");
const router = express.Router();
const { getContentManagerOverview } = require("../Controllers/contentMgrOverviewController");

// Combined endpoint that returns stats + recent contents
router.get("/summary", getContentManagerOverview);

module.exports = router;
