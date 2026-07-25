const express = require('express');
const router = express.Router();
const predictionsController = require('./predictions.controller');
// const authMiddleware = require('../../middleware/auth.middleware'); // Aktifkan jika butuh proteksi token

// Endpoint untuk memicu prediksi real-time
router.post('/', predictionsController.triggerPrediction);

module.exports = router;




// const express = require('express');
// const router = express.Router();
// const predictionController = require('./predictions.controller');
//
// router.get('/', predictionController.getPredictions);
//
// module.exports = router;