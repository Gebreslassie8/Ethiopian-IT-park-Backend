const express = require("express");
const router = express.Router();

const {
  getDownloadsReport,
  getViewsReport,
  getUsersReport,
  getCategoriesReport,
  getFrequentAccessReport,
  getUnderutilizedReport,
  getTimeSpentReport,
  getContentPerformanceReport,
  getActivityStatsReport,
  getRetentionRateReport,
  getStatusOverviewReport  // ✅ Added the status overview report import
} = require('../Controllers/AdminReportController');

// Report endpoints with optional pagination (page & limit)
router.get('/downloads', getDownloadsReport);
router.get('/views', getViewsReport);
router.get('/users', getUsersReport);
router.get('/categories', getCategoriesReport);
router.get('/frequentAccess', getFrequentAccessReport);
router.get('/underutilized', getUnderutilizedReport);
router.get('/timeSpent', getTimeSpentReport);
router.get('/contentPerformance', getContentPerformanceReport);
router.get('/retentionRate', getRetentionRateReport);

// New Activity Stats endpoint (no pagination)
router.get('/activityStats', getActivityStatsReport);

// New Status Overview endpoint (no pagination)
router.get('/statusOverview', getStatusOverviewReport);

module.exports = router;