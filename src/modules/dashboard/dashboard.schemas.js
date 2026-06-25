/**
 * Tambahkan schemas ini ke dalam objek `components.schemas`
 * di file src/docs/swagger.js Anda.
 *
 * Contoh integrasi di swagger.js:
 *
 *   const swaggerDefinition = {
 *     openapi: '3.0.0',
 *     info: { ... },
 *     components: {
 *       schemas: {
 *         // ... schema lain yang sudah ada
 *         ...dashboardSchemas,   // <-- spread di sini
 *       },
 *       responses: {
 *         Unauthorized: { ... },
 *         Forbidden: { ... },
 *       }
 *     }
 *   };
 */

const dashboardSchemas = {
  ProductSummary: {
    type: 'object',
    properties: {
      totalProduct: { type: 'integer', example: 42 },
      categories: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['GLOSS', 'PRO', 'SUPER', 'ACCESSORIES'],
              example: 'GLOSS',
            },
            total: { type: 'integer', example: 15 },
          },
        },
      },
    },
  },

  SalesPeriod: {
    type: 'object',
    properties: {
      totalAmount: { type: 'number', example: 1500000 },
      totalTransaction: { type: 'integer', example: 12 },
    },
  },

  SalesSummary: {
    type: 'object',
    properties: {
      today: { $ref: '#/components/schemas/SalesPeriod' },
      thisWeek: { $ref: '#/components/schemas/SalesPeriod' },
      thisMonth: { $ref: '#/components/schemas/SalesPeriod' },
    },
  },

  DailySales: {
    type: 'object',
    properties: {
      date: { type: 'string', format: 'date', example: '2025-06-20' },
      totalAmount: { type: 'number', example: 750000 },
      totalTransaction: { type: 'integer', example: 5 },
    },
  },

  MonthlySales: {
    type: 'object',
    properties: {
      month: { type: 'string', example: '2025-06' },
      totalAmount: { type: 'number', example: 12500000 },
      totalTransaction: { type: 'integer', example: 85 },
    },
  },

  EndOfMonthRecap: {
    type: 'object',
    properties: {
      period: {
        type: 'object',
        properties: {
          month: { type: 'integer', example: 6 },
          year: { type: 'integer', example: 2025 },
          label: { type: 'string', example: 'Juni 2025' },
        },
      },
      sales: {
        type: 'object',
        properties: {
          thisMonth: { $ref: '#/components/schemas/SalesPeriod' },
          lastMonth: { $ref: '#/components/schemas/SalesPeriod' },
          growthPercent: {
            type: 'number',
            nullable: true,
            example: 12.5,
            description: 'null jika bulan lalu tidak ada data',
          },
        },
      },
      purchases: {
        type: 'object',
        properties: {
          thisMonth: { $ref: '#/components/schemas/SalesPeriod' },
          lastMonth: { $ref: '#/components/schemas/SalesPeriod' },
          growthPercent: { type: 'number', nullable: true, example: -5.2 },
        },
      },
      netProfit: {
        type: 'object',
        properties: {
          thisMonth: { type: 'number', example: 5000000 },
          lastMonth: { type: 'number', example: 4200000 },
        },
      },
      topProducts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            product: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                code: { type: 'string', example: 'CAT-001' },
                name: { type: 'string', example: 'Cat Tembok Gloss 5Kg' },
                type: { type: 'string', example: 'GLOSS' },
                unit: { type: 'string', example: 'Kg' },
              },
            },
            totalQty: { type: 'number', example: 120 },
            totalRevenue: { type: 'number', example: 3600000 },
          },
        },
      },
    },
  },

  LowStockItem: {
    type: 'object',
    properties: {
      storeId: { type: 'string' },
      storeName: { type: 'string', example: 'Toko Cabang Singkil' },
      product: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          code: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' },
          unit: { type: 'string' },
        },
      },
      quantity: { type: 'number', example: 3 },
    },
  },

  LowStockAlert: {
    type: 'object',
    properties: {
      threshold: { type: 'integer', example: 10 },
      totalAlert: { type: 'integer', example: 4 },
      items: {
        type: 'array',
        items: { $ref: '#/components/schemas/LowStockItem' },
      },
    },
  },

  StoreSummary: {
    type: 'object',
    properties: {
      storeId: { type: 'string' },
      storeName: { type: 'string', example: 'Toko Cabang Balamoa' },
      thisMonth: {
        type: 'object',
        properties: {
          totalSales: { type: 'number', example: 8500000 },
          totalTransactions: { type: 'integer', example: 60 },
          totalPurchases: { type: 'number', example: 4000000 },
          totalStockQty: { type: 'number', example: 340 },
        },
      },
    },
  },
};

module.exports = { dashboardSchemas };