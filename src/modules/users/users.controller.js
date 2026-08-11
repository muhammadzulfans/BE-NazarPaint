const usersService = require('./users.service');

const getMe = async (req, res, next) => {
  try {
    const user = await usersService.getById(req.user.userId);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

const getAll = async (req, res, next) => {
  try {
    const data = await usersService.getAll(req.query);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await usersService.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await usersService.create(req.body);
    res.status(201).json({ success: true, message: 'User berhasil dibuat', data });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await usersService.update(req.params.id, req.body);
    res.json({ success: true, message: 'User berhasil diperbarui', data });
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const data = await usersService.updateStatus(req.params.id, req.body.status);
    res.json({ success: true, message: `Status berhasil diubah menjadi ${data.status}`, data });
  } catch (err) {
    next(err);
  }
};


const remove = async (req, res, next) => {
  try {
    await usersService.remove(req.params.id, req.user.userId);
    res.json({ success: true, message: 'User berhasil dihapus' });
  } catch (err) {
    next(err);
  }
};

// ─── AVATAR ───────────────────────────────────────────────────────────────────

// PATCH /api/users/me/avatar — upload foto sendiri
const uploadMyAvatar = async (req, res, next) => {
  try {
    const data = await usersService.updateAvatar(req.user.userId, req.file);
    res.json({ success: true, message: 'Foto profile berhasil diperbarui', data });
  } catch (err) {
    // Kalau upload gagal, hapus file yang terlanjur tersimpan
    if (req.file) {
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.join(process.cwd(), 'public', 'uploads', 'avatars', req.file.filename);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    next(err);
  }
};

// DELETE /api/users/me/avatar — hapus foto sendiri → kembali ke default
const deleteMyAvatar = async (req, res, next) => {
  try {
    const data = await usersService.deleteAvatar(req.user.userId);
    res.json({ success: true, message: 'Foto profile berhasil dihapus', data });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/:id/avatar — OWNER upload foto user lain
const uploadUserAvatar = async (req, res, next) => {
  try {
    const data = await usersService.updateAvatar(req.params.id, req.file);
    res.json({ success: true, message: 'Foto profile user berhasil diperbarui', data });
  } catch (err) {
    if (req.file) {
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.join(process.cwd(), 'public', 'uploads', 'avatars', req.file.filename);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    next(err);
  }
};

// DELETE /api/users/:id/avatar — OWNER hapus foto user lain
const deleteUserAvatar = async (req, res, next) => {
  try {
    const data = await usersService.deleteAvatar(req.params.id);
    res.json({ success: true, message: 'Foto profile user berhasil dihapus', data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMe,
  getAll,
  getById,
  create,
  update,
  remove,
  uploadMyAvatar,
  deleteMyAvatar,
  uploadUserAvatar,
  deleteUserAvatar,
  updateStatus,
};