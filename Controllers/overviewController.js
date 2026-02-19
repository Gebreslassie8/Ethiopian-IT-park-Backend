const {
  countTotalUsers,
  countTotalContents,
  countNewUsersThisMonth,
  countNewUsersLastMonth,
  countNewUploadsThisMonth,
  countNewUploadsLastMonth,
  getUserGrowthByMonth,
  getRecentlyUploadedContents,
} = require("../Models/overviewModel.js");

function calculateChange(current, previous) {
  if (previous === 0) {
    return current > 0 ? 100 : 0; // Return 100% increase if going from 0 to positive
  }
  return Math.round(((current - previous) / previous) * 100 * 100) / 100;
}

function getChangeText(change) {
  if (change > 0) {
    return "Increased this month";
  } else if (change < 0) {
    return "Decreased this month";
  } else {
    return "No change this month";
  }
}

const getOverviewSummary = async (req, res) => {
  try {
    // ✅ FIXED: Remove array destructuring - models now return direct values
    const totalUsers = await countTotalUsers();
    const totalContents = await countTotalContents();
    const newUsersThisMonth = await countNewUsersThisMonth();
    const newUsersLastMonth = await countNewUsersLastMonth();
    const newUploadsThisMonth = await countNewUploadsThisMonth();
    const newUploadsLastMonth = await countNewUploadsLastMonth();
    const userGrowthResult = await getUserGrowthByMonth();

    console.log('Debug Data:', {
      totalUsers,
      totalContents,
      newUsersThisMonth,
      newUsersLastMonth,
      newUploadsThisMonth,
      newUploadsLastMonth,
      userGrowthLength: userGrowthResult.length
    });

    const userChange = calculateChange(newUsersThisMonth, newUsersLastMonth);
    const uploadChange = calculateChange(newUploadsThisMonth, newUploadsLastMonth);

    const response = {
      "total-users": totalUsers,
      "total-content": totalContents,
      "new-users": newUsersThisMonth,
      "new-uploads": newUploadsThisMonth,
      "total-usersChange": userChange,
      "total-usersChangeText": getChangeText(userChange),
      "total-contentChange": uploadChange,
      "total-contentChangeText": getChangeText(uploadChange),
      "new-usersChange": userChange,
      "new-usersChangeText": getChangeText(userChange),
      "new-uploadsChange": uploadChange,
      "new-uploadsChangeText": getChangeText(uploadChange),
      userGrowth: userGrowthResult.map((row) => ({
        name: row.month,
        users: row.users,
      })),
    };

    res.json(response);
  } catch (error) {
    console.error("Overview summary error:", error);
    res.status(500).json({ message: "Failed to fetch overview summary" });
  }
};

const getRecentUploads = async (req, res) => {
  try {
    const recentContents = await getRecentlyUploadedContents();
    res.status(200).json(recentContents);
  } catch (error) {
    console.error("Error fetching recent contents:", error);
    res.status(500).json({ message: "Failed to fetch recent uploads" });
  }
};

module.exports = {
  getOverviewSummary,
  getRecentUploads,
};