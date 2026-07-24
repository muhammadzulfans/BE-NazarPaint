const predictionsService = require('./predictions.service');

async function triggerPrediction(req, res, next) {
    try {
        const { cabang, kode_cat } = req.body;

        if (!cabang || !kode_cat) {
            return res.status(400).json({
                status: 'error',
                message: 'Parameter cabang dan kode_cat wajib diisi!'
            });
        }

        const result = await predictionsService.generateAndSavePrediction(cabang, kode_cat);

        return res.status(200).json({
            status: 'success',
            message: 'Prediksi stok ARIMA berhasil dihasilkan dan disimpan!',
            data: result
        });

    } catch (error) {
        next(error); // Lempar ke error middleware
    }
}

module.exports = {
    triggerPrediction
};




// const predictionService = require('./predictions.service');
//
// const getPredictions = async (req, res, next) => {
//     try {
//         const { cabang, bulan } = req.query;
//         const data = await predictionService.getPrediksiStok({ cabang, bulan });
//
//         res.status(200).json({
//             success: true,
//             message: "Berhasil mengambil data prediksi stok",
//             total: data.length,
//             data: data
//         });
//     } catch (err) {
//         next(err);
//     }
// };
//
// module.exports = { getPredictions };