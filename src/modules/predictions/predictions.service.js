const axios = require('axios');

const FLASK_URL = 'https://flask-app-arima.vercel.app/predict';

async function generateAndSavePrediction(cabang, kodeCat) {
    try {
        let formattedKode = String(kodeCat);
        if (!formattedKode.includes('.')) {
            formattedKode = `${formattedKode}.0`;
        }

        const response = await axios.post(FLASK_URL, {
            cabang: cabang,
            kode_cat: formattedKode
        }, {
            timeout: 30000,
            headers: { 'Content-Type': 'application/json' }
        });

        // ✅ FIX: Gunakan key yang benar dari Flask
        const { prediksi_stok_pembelian, status } = response.data;

        if (status !== 'success') {
            throw new Error("Gagal mendapatkan hasil prediksi dari layanan AI.");
        }

        return {
            cabang: cabang,
            kode_cat: String(kodeCat),
            prediksi_stok_pembelian: prediksi_stok_pembelian,  // ← key benar
            target_bulan: "2026-03"
        };

    } catch (error) {
        console.error("Error dalam predictions.service.js:", error.response?.data || error.message);
        throw error;
    }
}

module.exports = { generateAndSavePrediction };