const stockService = require('./stocks.service');

const getAll = async (req, res, next) => {
  try {
    const { storeId, type, search, startDate, endDate, page, limit } = req.query;

    const resolvedStoreId = req.user.role === 'KARYAWAN'
      ? req.user.storeId
      : storeId;

    const data = await stockService.getAll({
      storeId: resolvedStoreId,
      type,
      search,
      startDate,
      endDate,
      page,
      limit
    });

    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const getSummary = async (req, res, next) => {
  try {
    const storeId = req.user.role === 'KARYAWAN'
      ? req.user.storeId
      : req.params.storeId;

    const data = await stockService.getSummaryByStore(storeId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const upsertStock = async (req, res, next) => {
  try {
    const { productId, storeId, quantity, mode } = req.body;

    // Karyawan hanya bisa update stok cabangnya sendiri
    if (req.user.role === 'KARYAWAN' && storeId !== req.user.storeId) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda hanya bisa update stok cabang sendiri'
      });
    }

    const data = await stockService.upsertStock({ productId, storeId, quantity, mode });
    res.json({ success: true, message: 'Stok berhasil diupdate', data });
  } catch (err) { next(err); }
};

const getByProductAndStore = async (req, res, next) => {
  try {
    const { productId, storeId } = req.params;
    const data = await stockService.getByProductAndStore(productId, storeId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

module.exports = { getAll, getSummary, upsertStock, getByProductAndStore };