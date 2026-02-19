const {
  countTotalContents,
  countNewUploadsThisMonth,
  countNewUploadsLastMonth,
  getTotalDownloads,
  getTotalViews,
  getContentGrowthByMonth,
  getRecentlyUploadedContents,
} = require("../Models/contentMgrOverviewModel");

function calculateChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 100) / 100;
}

const getChangeText = (change) => {
  if (change === 0) return "No change last month";
  return change > 0 ? `Increased by ${change}%` : `Decreased by ${Math.abs(change)}%`;
};

const getContentManagerOverview = async (req, res) => {
  try {
    console.log('Starting content manager overview...');
    
    // ✅ FIXED: Handle db.execute() and db.query() consistently
    // db.execute() returns [rows, fields] - we need rows[0]
    const [totalContentsRows] = await countTotalContents();
    const totalContent = Number(totalContentsRows[0]?.total || 0);

    const [newUploadsThisMonthRows] = await countNewUploadsThisMonth();
    const newUploads = Number(newUploadsThisMonthRows[0]?.total || 0);

    const [newUploadsLastMonthRows] = await countNewUploadsLastMonth();
    const newUploadsLastMonth = Number(newUploadsLastMonthRows[0]?.total || 0);

    const [downloadsRows] = await getTotalDownloads();
    const totalDownloads = Number(downloadsRows[0]?.total || 0);

    const [viewsRows] = await getTotalViews();
    const totalViews = Number(viewsRows[0]?.total || 0);

    const [growthRows] = await getContentGrowthByMonth();
    const recentContents = await getRecentlyUploadedContents();

    console.log('Debug Content Manager Data:', {
      totalContent,
      newUploads,
      newUploadsLastMonth,
      totalDownloads,
      totalViews,
      growthRowsLength: growthRows?.length,
      growthRowsSample: growthRows?.[0]
    });

    const newUploadsChange = calculateChange(newUploads, newUploadsLastMonth);

    res.json({
      totalContent,
      totalContentChange: 0,
      totalContentChangeText: getChangeText(0),

      newUploads,
      newUploadsChange,
      newUploadsChangeText: getChangeText(newUploadsChange),

      totalDownloads,
      totalDownloadsChange: 0,
      totalDownloadsChangeText: getChangeText(0),

      totalViews,
      totalViewsChange: 0,
      totalViewsChangeText: getChangeText(0),

      contentGrowth: Array.isArray(growthRows) ? growthRows.map((row) => ({
        name: row.month,
        uploads: row.uploads,
      })) : [],

      recentContents: Array.isArray(recentContents) ? recentContents : [],
    });

  } catch (error) {
    console.error("Content Manager Overview Error:", error);
    res.status(500).json({ 
      message: "Failed to load content manager overview",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  getContentManagerOverview,
};