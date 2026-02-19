const AdminReportModel = require('../Models/AdminReportModel');

const getPaginationParams = (req) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  return { page, limit };
};

const getContentPerformanceReport = async (req, res) => {
  const { page, limit } = getPaginationParams(req);
  try {
    console.log('getContentPerformanceReport called');
    const data = await AdminReportModel.getContentPerformance(page, limit);
    const total = await AdminReportModel.getContentPerformanceCount();
    res.json({ data, total, page, limit });
  } catch (error) {
    console.error('Error in getContentPerformanceReport:', error.message);
    res.status(500).json({ error: 'Failed to fetch content performance report', details: error.message });
  }
};

const getDownloadsReport = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req);
    console.log('getDownloadsReport called');
    const data = await AdminReportModel.getDownloads(page, limit);
    const total = await AdminReportModel.getDownloadsCount();
    res.json({ data, total, page, limit });
  } catch (error) {
    console.error('Error in getDownloadsReport:', error.message);
    res.status(500).json({ error: 'Failed to fetch downloads report', details: error.message });
  }
};

const getViewsReport = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req);
    console.log('getViewsReport called');
    const data = await AdminReportModel.getViews(page, limit);
    const total = await AdminReportModel.getViewsCount();
    res.json({ data, total, page, limit });
  } catch (error) {
    console.error('Error in getViewsReport:', error.message);
    res.status(500).json({ error: 'Failed to fetch views report', details: error.message });
  }
};

const getUsersReport = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req);
    console.log('getUsersReport called');
    const data = await AdminReportModel.getUsers(page, limit);
    const total = await AdminReportModel.getUsersCount();
    res.json({ data, total, page, limit });
  } catch (error) {
    console.error('Error in getUsersReport:', error.message);
    res.status(500).json({ error: 'Failed to fetch users report', details: error.message });
  }
};

const getCategoriesReport = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req);
    console.log('getCategoriesReport called');
    const data = await AdminReportModel.getCategories(page, limit);
    const total = await AdminReportModel.getCategoriesCount();
    res.json({ data, total, page, limit });
  } catch (error) {
    console.error('Error in getCategoriesReport:', error.message);
    res.status(500).json({ error: 'Failed to fetch categories report', details: error.message });
  }
};

const getCategoryUsageReport = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req);
    console.log('getCategoryUsageReport called');
    const data = await AdminReportModel.getCategories(page, limit);
    const total = await AdminReportModel.getCategoriesCount();
    res.json({ data, total, page, limit });
  } catch (error) {
    console.error('Error in getCategoryUsageReport:', error.message);
    res.status(500).json({ error: 'Failed to fetch category usage report', details: error.message });
  }
};

const getFrequentAccessReport = async (req, res) => {
  const { page, limit } = getPaginationParams(req);
  try {
    const data = await AdminReportModel.getFrequentAccess(page, limit);
    const total = data.length < limit ? page * limit : page * limit + 1;
    res.json({ data, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch frequent access report', details: error.message });
  }
};

const getUnderutilizedReport = async (req, res) => {
  const { page, limit } = getPaginationParams(req);
  try {
    const data = await AdminReportModel.getUnderutilized(page, limit);
    const total = data.length < limit ? page * limit : page * limit + 1;
    res.json({ data, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch underutilized report', details: error.message });
  }
};

const getTimeSpentReport = async (req, res) => {
  const { page, limit } = getPaginationParams(req);
  try {
    const data = await AdminReportModel.getTimeSpent(page, limit);
    const total = data.length < limit ? page * limit : page * limit + 1;
    res.json({ data, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch time spent report', details: error.message });
  }
};

const getActivityStatsReport = async (req, res) => {
  try {
    console.log('getActivityStatsReport called');
    const data = await AdminReportModel.getActivityStats();
    res.json({ data });
  } catch (error) {
    console.error('Error in getActivityStatsReport:', error.message);
    res.status(500).json({ error: 'Failed to fetch activity stats report', details: error.message });
  }
};

const getRetentionRateReport = async (req, res) => {
  try {
    const { page, limit } = getPaginationParams(req);
    console.log('getRetentionRateReport called');
    const data = await AdminReportModel.getRetentionRate(page, limit);
    const total = await AdminReportModel.getRetentionRateCount();
    
    // Calculate average retention rate
    const average_retention = data.length > 0 ? 
      (data.reduce((sum, item) => sum + (item.retention_rate || 0), 0) / data.length) : 0;

    res.json({ 
      data, 
      total, 
      page, 
      limit,
      metrics: {
        average_retention: parseFloat(average_retention.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Error in getRetentionRateReport:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch retention rate report', 
      details: error.message 
    });
  }
};
const getStatusOverviewReport = async (req, res) => {
  try {
    console.log('getStatusOverviewReport called');
    const data = await AdminReportModel.getStatusOverview();
    res.json({ data });
  } catch (error) {
    console.error('Error in getStatusOverviewReport:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch status overview report', 
      details: error.message 
    });
  }
};

module.exports = {
  getDownloadsReport,
  getViewsReport,
  getUsersReport,
  getCategoriesReport,
  getCategoryUsageReport,
  getFrequentAccessReport,
  getUnderutilizedReport,
  getTimeSpentReport,
  getContentPerformanceReport,
  getActivityStatsReport,
  getStatusOverviewReport,  
  getRetentionRateReport
};