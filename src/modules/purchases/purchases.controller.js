const purchaseService = require('./purchases.service');

const getAll = async (req, res, next) => {
  try {
    const { status, type, search, startDate, endDate, page, limit } = req.query;

    const storeId = req.user.role === 'KARYAWAN'
      ? req.user.storeId
      : req.query.storeId;

    const data = await purchaseService.getAll({ storeId, status, type, search, startDate, endDate, page, limit });
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const data = await purchaseService.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const storeId = req.user.role === 'KARYAWAN'
      ? req.user.storeId
      : req.body.storeId;

    const data = await purchaseService.create({
      ...req.body,
      storeId,
      userId: req.user.userId
    });

    res.status(201).json({ success: true, message: 'PO berhasil dibuat, menunggu konfirmasi penerimaan', data });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const data = await purchaseService.update(req.params.id, req.body, req.user.role);
    res.json({ success: true, message: 'Transaksi belanja berhasil diupdate', data });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await purchaseService.remove(req.params.id, req.user.role);
    res.json({ success: true, message: 'Transaksi belanja berhasil dihapus' });
  } catch (err) { next(err); }
};

const receive = async (req, res, next) => {
  try {
    const data = await purchaseService.receive(req.params.id, req.user.role);
    res.json({ success: true, message: 'Barang berhasil diterima, stok bertambah', data });
  } catch (err) { next(err); }
};

const cancel = async (req, res, next) => {
  try {
    const data = await purchaseService.cancel(req.params.id, req.user.role);
    res.json({ success: true, message: 'PO berhasil dibatalkan', data });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove, receive, cancel };