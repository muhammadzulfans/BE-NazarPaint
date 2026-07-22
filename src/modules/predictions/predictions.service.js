const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const getPrediksiStok = async ({ cabang, bulan }) => {
    let query = supabase.from('prediksi_stok').select('*');

    if (cabang) {
        query = query.eq('cabang', cabang);
    }
    if (bulan) {
        query = query.eq('target_month', bulan);
    }

    const { data, error } = await query;
    if (error) throw { statusCode: 500, message: error.message };

    return data;
};

module.exports = { getPrediksiStok };