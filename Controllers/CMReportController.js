const reportModel = require('../Models/CMReportModel');

exports.getReport = async (req, res) => {
  const { reportType } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    let data, totalCount;

    switch (reportType) {
      case 'recentUploads':
        data = await reportModel.getRecentUploads(limit, offset);
        totalCount = await reportModel.countRecentUploads();
        break;
      case 'statusOverview':
        data = await reportModel.getStatusOverview();
        break;
      case 'contentPerformance':
        data = await reportModel.getContentPerformance(limit, offset);
        totalCount = await reportModel.countContentPerformance();
        break;
      case 'retentionRate':
        data = await reportModel.getRetentionRate(limit, offset);
        totalCount = await reportModel.countRetentionRate();
        break;
      case 'frequentAccess':
        data = await reportModel.getFrequentAccess(limit, offset);
        totalCount = await reportModel.countFrequentAccess();
        break;
      case 'underutilized':
        data = await reportModel.getUnderutilized(limit, offset);
        totalCount = await reportModel.countUnderutilized();
        break;
      case 'timeSpent':
        data = await reportModel.getTimeSpent(limit, offset);
        totalCount = await reportModel.countTimeSpent();
        break;
      case 'activityStats':
        data = await reportModel.getActivityStats();
        break;
      default:
        return res.status(400).json({ error: `Invalid report type: '${reportType}'` });
    }

    // For paginated reports
    if ([
      'recentUploads', 
      'contentPerformance', 
      'retentionRate',
      'frequentAccess', 
      'underutilized', 
      'timeSpent'
    ].includes(reportType)) {
      return res.status(200).json({
        data,
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      });
    }

    // For non-paginated reports
    return res.status(200).json({ data });

  } catch (err) {
    console.error(`Error fetching ${reportType} report:`, err.message);
    return res.status(500).json({ 
      error: `Failed to fetch ${reportType} report`,
      details: err.message 
    });
  }
};