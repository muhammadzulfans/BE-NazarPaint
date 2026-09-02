const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./middleware/error.middleware');
const authRoute = require('./modules/auth/auth.route');
const storeRoute = require('./modules/stores/stores.route');
const productRoute = require('./modules/products/products.route');
const stockRoute = require('./modules/stocks/stocks.route')
const saleRoute = require('./modules/sales/sales.route')
const purchaseRoute = require('./modules/purchases/purchases.route')
const mutationsRoute = require('./modules/mutations/mutations.route')
const userRoute = require('./modules/users/users.route');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const stockOpnameRoute = require('./modules/stock-opnames/stock-opnames.route');
const dashBoardRoute = require('./modules/dashboard/dashboard.route');

const predictionRoute = require('./modules/predictions/predictions.route');

const path = require('path');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);
app.use('/api/stores', storeRoute);
app.use('/api/products', productRoute);
app.use('/api/stocks', stockRoute);
app.use('/api/sales', saleRoute);
app.use('/api/purchases', purchaseRoute);
app.use('/api/mutations', mutationsRoute);
app.use('/api/stock-opnames', stockOpnameRoute);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'NazarPaint API Docs',
  customCss: '.swagger-ui .topbar { background-color: #EAB308 }' // warna kuning sesuai UI
}));
app.use('/api/dashboard', dashBoardRoute);
// route endpoint predictions
app.use('/api/predictions', predictionRoute);
// app.use('/api/users', userRoute); // ← uncomment kalau sudah dibuat

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.path} tidak ditemukan` 
  });
});

// Error handler — HARUS paling bawah
app.use(errorHandler);

module.exports = app;