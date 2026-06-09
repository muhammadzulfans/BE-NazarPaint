const saleService = require('./sales.service');

const getAll = async (req, res, next) => {
  try {
    const { type, search, startDate, endDate, page, limit } = req.query;

    const storeId = req.user.role === 'KARYAWAN'
      ? req.user.storeId
      : req.query.storeId;

    const data = await saleService.getAll({ storeId, type, search, startDate, endDate, page, limit });
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const data = await saleService.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const storeId = req.user.role === 'KARYAWAN'
      ? req.user.storeId
      : req.body.storeId;

    const data = await saleService.create({
      ...req.body,
      storeId,
      userId: req.user.userId
    });

    res.status(201).json({ success: true, message: 'Transaksi penjualan berhasil disimpan', data });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const data = await saleService.update(
      req.params.id,
      req.body,
      req.user.userId,
      req.user.role
    );
    res.json({ success: true, message: 'Transaksi penjualan berhasil diupdate', data });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await saleService.remove(req.params.id, req.user.role);
    res.json({ success: true, message: 'Transaksi penjualan berhasil dihapus' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };