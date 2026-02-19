const express = require('express');
const router = express.Router();
const reportController = require('../Controllers/CMReportController');

router.get('/:reportType', reportController.getReport);

module.exports = router;

