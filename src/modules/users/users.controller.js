const userService = require('./users.service');

const getAll = async (req, res, next) => {
  try {
    const data = await userService.getAll();
    res.json({ success: true, total: data.length, data });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const data = await userService.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const data = await userService.create(req.body);
    res.status(201).json({ success: true, message: 'Akun berhasil dibuat', data });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const data = await userService.update(req.params.id, req.body);
    res.json({ success: true, message: 'Akun berhasil diupdate', data });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await userService.remove(req.params.id, req.user.userId);
    res.json({ success: true, message: 'Akun berhasil dihapus' });
  } catch (err) { next(err); }
};

// Get profile sendiri
const getMe = async (req, res, next) => {
  try {
    const data = await userService.getById(req.user.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove, getMe };