const axios = require('axios');

const FLASK_URL = 'http://localhost:5000/predict';

async function generateAndSavePrediction(cabang, kodeCat) {
    try {
        let formattedKode = String(kodeCat);
        if (!formattedKode.includes('.')) {
            formattedKode = `${formattedKode}.0`;
        }

        const response = await axios.post(FLASK_URL, {
            cabang: cabang,
            kode_cat: formattedKode
        });

        // Menangkap hasil prediksi penjualan dari Flask
        const { prediksi_penjualan, status } = response.data;

        if (status !== 'success') {
            throw new Error("Gagal mendapatkan hasil prediksi dari layanan AI.");
        }

        return {
            cabang: cabang,
            kode_cat: String(kodeCat),
            prediksi_penjualan: prediksi_penjualan,
            target_bulan: "2026-03"
        };

    } catch (error) {
        console.error("Error dalam predictions.service.js:", error.response?.data || error.message);
        throw error;
    }
}

module.exports = {
    generateAndSavePrediction
};