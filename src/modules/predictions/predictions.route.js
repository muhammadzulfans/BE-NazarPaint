const express = require('express');
const router = express.Router();
const predictionController = require('./predictions.controller');

router.get('/', predictionController.getPredictions);

module.exports = router;