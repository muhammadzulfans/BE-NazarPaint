const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { getAll, getById, create, update, remove, toggleStatus } = require('./products.controller');

const router = Router();

router.use(authenticate);

// Semua role bisa lihat
router.get('/', getAll);
router.get('/:id', getById);

// Hanya OWNER yang bisa CRUD
router.post('/', authorize('OWNER'), create);
router.put('/:id', authorize('OWNER'), update);
router.delete('/:id', authorize('OWNER'), remove);
router.patch('/:id/toggle-status', authorize('OWNER'), toggleStatus);
module.exports = router;