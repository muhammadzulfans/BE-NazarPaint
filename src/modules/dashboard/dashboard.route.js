const express = require('express');
const router = express.Router();
const ctrl = require('./dashboard.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Ringkasan & rekap data toko
 */

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Ambil semua data dashboard sekaligus
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: Filter cabang (OWNER only). Jika kosong, semua cabang.
 *       - in: query
 *         name: lowStockThreshold
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Batas stok dianggap menipis (default 10)
 *     responses:
 *       200:
 *         description: Data dashboard berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     productSummary:
 *                       $ref: '#/components/schemas/ProductSummary'
 *                     salesSummary:
 *                       $ref: '#/components/schemas/SalesSummary'
 *                     weeklySalesTrend:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DailySales'
 *                     monthlySalesTrend:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MonthlySales'
 *                     endOfMonthRecap:
 *                       $ref: '#/components/schemas/EndOfMonthRecap'
 *                     lowStockAlert:
 *                       $ref: '#/components/schemas/LowStockAlert'
 *                     storeSummary:
 *                       type: array
 *                       description: Hanya untuk OWNER
 *                       items:
 *                         $ref: '#/components/schemas/StoreSummary'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', authenticate, ctrl.getDashboard);

/**
 * @swagger
 * /api/dashboard/products:
 *   get:
 *     summary: Ringkasan produk per kategori
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ringkasan produk
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ProductSummary'
 */
router.get('/products', authenticate, ctrl.getProductSummary);

/**
 * @swagger
 * /api/dashboard/sales/summary:
 *   get:
 *     summary: Ringkasan penjualan (hari ini, minggu ini, bulan ini)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: Filter cabang (OWNER only)
 *     responses:
 *       200:
 *         description: Ringkasan penjualan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SalesSummary'
 */
router.get('/sales/summary', authenticate, ctrl.getSalesSummary);

/**
 * @swagger
 * /api/dashboard/sales/weekly:
 *   get:
 *     summary: Trend penjualan 7 hari terakhir
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: Filter cabang (OWNER only)
 *     responses:
 *       200:
 *         description: Data penjualan per hari (7 hari)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DailySales'
 */
router.get('/sales/weekly', authenticate, ctrl.getWeeklySalesTrend);

/**
 * @swagger
 * /api/dashboard/sales/monthly:
 *   get:
 *     summary: Trend penjualan 12 bulan terakhir
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: Filter cabang (OWNER only)
 *     responses:
 *       200:
 *         description: Data penjualan per bulan (12 bulan)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MonthlySales'
 */
router.get('/sales/monthly', authenticate, ctrl.getMonthlySalesTrend);

/**
 * @swagger
 * /api/dashboard/recap:
 *   get:
 *     summary: Rekap akhir bulan (penjualan, pembelian, profit, top produk)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: Filter cabang (OWNER only)
 *     responses:
 *       200:
 *         description: Rekap akhir bulan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/EndOfMonthRecap'
 */
router.get('/recap', authenticate, ctrl.getEndOfMonthRecap);

/**
 * @swagger
 * /api/dashboard/low-stock:
 *   get:
 *     summary: Daftar produk dengan stok menipis
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: Filter cabang (OWNER only)
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Batas stok dianggap menipis
 *     responses:
 *       200:
 *         description: Daftar stok menipis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/LowStockAlert'
 */
router.get('/low-stock', authenticate, ctrl.getLowStockAlert);

/**
 * @swagger
 * /api/dashboard/stock-recap:
 *   get:
 *     summary: Rekap stok bulan ini (order, masuk, keluar, akhir)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: Filter cabang (OWNER only)
 *     responses:
 *       200:
 *         description: Rekap stok
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalStokOrder:
 *                       type: number
 *                       description: Qty Purchase masih PENDING
 *                       example: 218
 *                     totalStokMasuk:
 *                       type: number
 *                       description: Qty Purchase RECEIVED bulan ini
 *                       example: 37
 *                     totalStokKeluar:
 *                       type: number
 *                       description: Qty penjualan bulan ini
 *                       example: 197
 *                     totalStokAkhir:
 *                       type: number
 *                       description: Total stok tersisa saat ini
 *                       example: 340
 */
router.get('/stock-recap', authenticate, ctrl.getStockRecap);

/**
 *   get:
 *     summary: Ringkasan penjualan & stok per cabang (OWNER only)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ringkasan semua cabang
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/StoreSummary'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/stores', authenticate, authorize('OWNER'), ctrl.getStoreSummary);

module.exports = router;