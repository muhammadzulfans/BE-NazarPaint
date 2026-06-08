const { Router } = require('express');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { getAll, getSummary, upsertStock, getByProductAndStore } = require('./stocks.controller');

const router = Router();

router.use(authenticate);

router.get('/', getAll);
router.get('/summary/:storeId', getSummary);
router.get('/detail/:productId/:storeId', getByProductAndStore); // fix prefix
router.post('/', authorize('OWNER', 'KARYAWAN'), upsertStock);

module.exports = router;