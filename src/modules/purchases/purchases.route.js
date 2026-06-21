const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { getAll, getById, create, update, remove, receive, cancel } = require('./purchases.controller');

const router = Router();

router.use(authenticate);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', authorize('OWNER', 'KARYAWAN'), create);
router.put('/:id', authorize('OWNER', 'KARYAWAN'), update);
router.patch('/:id/receive', authorize('OWNER', 'KARYAWAN'), receive);
router.patch('/:id/cancel', authorize('OWNER', 'KARYAWAN'), cancel);
router.delete('/:id', authorize('OWNER'), remove);

module.exports = router;