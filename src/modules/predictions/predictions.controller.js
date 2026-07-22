const predictionService = require('./predictions.service');

const getPredictions = async (req, res, next) => {
    try {
        const { cabang, bulan } = req.query;
        const data = await predictionService.getPrediksiStok({ cabang, bulan });

        res.status(200).json({
            success: true,
            message: "Berhasil mengambil data prediksi stok",
            total: data.length,
            data: data
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { getPredictions };