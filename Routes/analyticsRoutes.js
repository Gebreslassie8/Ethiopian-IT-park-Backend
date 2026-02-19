const express = require("express");
const router = express.Router();
const { getAnnualActiveUsers ,getMonthlyActivity ,fetchFrequentlyAccessed 
    ,fetchUnderutilized, fetchTimeSpentPerCategory} = require("../Controllers/analyticsController");

router.get("/active-users", getAnnualActiveUsers);

router.get("/monthly", getMonthlyActivity); //uploads and downloads
router.get("/frequently-accessed", fetchFrequentlyAccessed);
router.get("/underutilized", fetchUnderutilized);
router.get("/time-spent" ,fetchTimeSpentPerCategory);

module.exports = router;
