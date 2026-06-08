const storeService = require('./stores.service');

const getAll = async (req, res, next) => {
  try {
    const data = await storeService.getAll();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const data = await storeService.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = await storeService.create(req.body);
    res.status(201).json({ success: true, message: 'Cabang toko berhasil dibuat', data });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const data = await storeService.update(req.params.id, req.body);
    res.json({ success: true, message: 'Cabang toko berhasil diupdate', data });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await storeService.remove(req.params.id);
    res.json({ success: true, message: 'Cabang toko berhasil dihapus' });
  } catch (err) { next(err); }
};

const assignUser = async (req, res, next) => {
  try {
    const data = await storeService.assignUser(req.params.id, req.body.userId);
    res.status(201).json({ success: true, message: 'Karyawan berhasil ditambahkan ke cabang', data });
  } catch (err) { next(err); }
};

const unassignUser = async (req, res, next) => {
  try {
    await storeService.unassignUser(req.params.id, req.body.userId);
    res.json({ success: true, message: 'Karyawan berhasil dihapus dari cabang' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove, assignUser, unassignUser };