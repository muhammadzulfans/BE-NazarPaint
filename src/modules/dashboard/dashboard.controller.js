const dashboardService = require('./dashboard.service');

// GET /api/dashboard
async function getDashboard(req, res, next) {
  try {
    const data = await dashboardService.getDashboard(req.user, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// GET /api/dashboard/products  — ringkasan kategori & total produk
async function getProductSummary(req, res, next) {
  try {
    const data = await dashboardService.getProductSummary();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// GET /api/dashboard/sales/summary  — penjualan hari ini / minggu / bulan
async function getSalesSummary(req, res, next) {
  try {
    const data = await dashboardService.getSalesSummary(req.user, req.query.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// GET /api/dashboard/sales/weekly  — trend 7 hari terakhir
async function getWeeklySalesTrend(req, res, next) {
  try {
    const data = await dashboardService.getWeeklySalesTrend(req.user, req.query.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// GET /api/dashboard/sales/monthly  — trend 12 bulan terakhir
async function getMonthlySalesTrend(req, res, next) {
  try {
    const data = await dashboardService.getMonthlySalesTrend(req.user, req.query.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// GET /api/dashboard/recap  — rekap akhir bulan + top produk
async function getEndOfMonthRecap(req, res, next) {
  try {
    const data = await dashboardService.getEndOfMonthRecap(req.user, req.query.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// GET /api/dashboard/low-stock  — stok menipis
async function getLowStockAlert(req, res, next) {
  try {
    const threshold = req.query.threshold ? parseInt(req.query.threshold) : 10;
    const data = await dashboardService.getLowStockAlert(req.user, req.query.storeId, threshold);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// GET /api/dashboard/stores  — ringkasan per cabang (OWNER only)
async function getStoreSummary(req, res, next) {
  try {
    const data = await dashboardService.getStoreSummary();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// GET /api/dashboard/stock-recap  — rekap stok order/masuk/keluar/akhir
async function getStockRecap(req, res, next) {
  try {
    const data = await dashboardService.getStockRecap(req.user, req.query.storeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
  getProductSummary,
  getSalesSummary,
  getWeeklySalesTrend,
  getMonthlySalesTrend,
  getEndOfMonthRecap,
  getStockRecap,
  getLowStockAlert,
  getStoreSummary,
};