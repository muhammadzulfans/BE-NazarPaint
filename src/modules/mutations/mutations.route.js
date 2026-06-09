const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { getAll, getById, create, remove } = require('./mutations.controller');

const router = Router();

router.use(authenticate);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', authorize('OWNER', 'KARYAWAN'), create);
router.delete('/:id', authorize('OWNER'), remove);

module.exports = router;