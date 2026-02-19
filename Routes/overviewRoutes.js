const express = require("express");
const { getOverviewSummary,getRecentUploads} = require("../Controllers/overviewController.js");

const router = express.Router();

// Route for Summary Stats
router.get("/overview/summary", getOverviewSummary);

// Route for Recent Activity
//router.get("/overview/activity", getOverviewActivity);

router.get("/recent",getRecentUploads);
module.exports = router;
