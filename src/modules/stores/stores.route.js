const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { getAll, getById, create, update, remove, restore, assignUser, unassignUser } = require('./stores.controller');

const router = Router();

// Semua route butuh login
router.use(authenticate);

// GET /api/stores — semua role bisa lihat (default hanya aktif)
router.get('/', getAll);
router.get('/:id', getById);

// Hanya OWNER yang bisa create/update/delete/restore/assign
router.post('/', authorize('OWNER'), create);
router.put('/:id', authorize('OWNER'), update);
router.delete('/:id', authorize('OWNER'), remove);
router.patch('/:id/restore', authorize('OWNER'), restore); // <-- BARU
router.post('/:id/assign', authorize('OWNER'), assignUser);
router.delete('/:id/assign', authorize('OWNER'), unassignUser);

module.exports = router;