const {
  getActiveUsersByMonth,
  getMonthlyActivity,
  getFrequentlyAccessedContents,
  getUnderutilizedContents,
  getTimeSpentPerCategory,
} = require("../Models/analyticsModel");

exports.getAnnualActiveUsers = async (req, res) => {
  const year = req.query.year || new Date().getFullYear();

  try {
    const rows = await getActiveUsersByMonth(year);

    const allMonths = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",

      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthMap = new Map(rows.map((r) => [r.month, r.users]));

    const responseData = allMonths.map((month) => ({
      month,

      users: monthMap.get(month) || 0,
    }));

    res.json(responseData);
  } catch (err) {
    console.error("Error fetching annual active users:", err);

    res.status(500).json({ message: "Server error" });
  }
};

exports.getMonthlyActivity = async (req, res) => {
  //uploads and downloads
  const year = req.query.year || new Date().getFullYear();

  try {
    const rows = await getMonthlyActivity(year);

    const allMonths = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const activityData = allMonths.map((month) => {
      const found = rows.find((r) => r.month === month);
      return {
        month,
        uploads: found ? found.uploads : 0,
        downloads: found ? found.downloads : 0,
      };
    });

    res.status(200).json(activityData);
  } catch (err) {
    console.error("Error in getMonthlyActivity:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.fetchFrequentlyAccessed = async (req, res) => {
  try {
    const data = await getFrequentlyAccessedContents();
    res.json(data);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to fetch frequently accessed contents" });
  }
};

exports.fetchUnderutilized = async (req, res) => {
  try {
    const data = await getUnderutilizedContents();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch underutilized contents" });
  }
};
exports.fetchTimeSpentPerCategory = async (req, res) => {
  try {
    const data = await getTimeSpentPerCategory();
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching time spent data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
