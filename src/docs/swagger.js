const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NazarPaint API',
      version: '1.0.0',
      description: 'API untuk sistem manajemen toko cat NazarPaint',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        // AUTH
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Admin Owner' },
            email: { type: 'string', example: 'owner@nazarpaint.com' },
            password: { type: 'string', example: 'password123' },
            jabatan: { type: 'string', example: 'MANAGEMENT' },
            role: { type: 'string', enum: ['OWNER', 'KARYAWAN'], example: 'OWNER' },
            storeId: { type: 'string', example: 'store-id' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'owner@nazarpaint.com' },
            password: { type: 'string', example: 'password123' }
          }
        },

        // STORE
        StoreRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'NazarPaint Tegal' },
            address: { type: 'string', example: 'Jl. Contoh No. 1, Tegal' }
          }
        },

        // PRODUCT
        ProductRequest: {
          type: 'object',
          required: ['code', 'name', 'type', 'basePrice', 'sellPrice'],
          properties: {
            code: { type: 'string', example: '515' },
            name: { type: 'string', example: 'Silver' },
            type: { type: 'string', enum: ['GLOSS', 'PRO', 'SUPER', 'ACCESSORIES'] },
            basePrice: { type: 'integer', example: 30000 },
            sellPrice: { type: 'integer', example: 35000 },
            unit: { type: 'string', example: 'Kg' }
          }
        },

        // STOCK
        StockRequest: {
          type: 'object',
          required: ['productId', 'storeId', 'quantity'],
          properties: {
            productId: { type: 'string', example: 'product-id' },
            storeId: { type: 'string', example: 'store-id' },
            quantity: { type: 'number', example: 50 },
            mode: { type: 'string', enum: ['SET', 'ADD', 'SUBTRACT'], example: 'SET' }
          }
        },

        // SALE
        SaleItemRequest: {
          type: 'object',
          required: ['productId', 'quantity', 'sellPrice'],
          properties: {
            productId: { type: 'string', example: 'product-id' },
            quantity: { type: 'number', example: 5 },
            sellPrice: { type: 'integer', example: 35000 }
          }
        },
        SaleRequest: {
          type: 'object',
          required: ['items'],
          properties: {
            storeId: { type: 'string', example: 'store-id' },
            date: { type: 'string', format: 'date', example: '2026-06-08' },
            items: {
              type: 'array',
              items: { '$ref': '#/components/schemas/SaleItemRequest' }
            }
          }
        },

        // PURCHASE
        PurchaseItemRequest: {
          type: 'object',
          required: ['productId', 'quantity', 'basePrice'],
          properties: {
            productId: { type: 'string', example: 'product-id' },
            quantity: { type: 'number', example: 20 },
            basePrice: { type: 'integer', example: 30000 }
          }
        },
        PurchaseRequest: {
          type: 'object',
          required: ['items'],
          properties: {
            storeId: { type: 'string', example: 'store-id' },
            date: { type: 'string', format: 'date', example: '2026-06-08' },
            items: {
              type: 'array',
              items: { '$ref': '#/components/schemas/PurchaseItemRequest' }
            }
          }
        },

        // MUTATION
        MutationItemRequest: {
          type: 'object',
          required: ['productId', 'quantity'],
          properties: {
            productId: { type: 'string', example: 'product-id' },
            quantity: { type: 'number', example: 10 }
          }
        },
        MutationRequest: {
          type: 'object',
          required: ['toStoreId', 'items'],
          properties: {
            fromStoreId: { type: 'string', example: 'store-id-asal' },
            toStoreId: { type: 'string', example: 'store-id-tujuan' },
            note: { type: 'string', example: 'Transfer stok rutin' },
            date: { type: 'string', format: 'date', example: '2026-06-08' },
            items: {
              type: 'array',
              items: { '$ref': '#/components/schemas/MutationItemRequest' }
            }
          }
        },

        // USER
        UserRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Siti Karyawan' },
            email: { type: 'string', example: 'siti@nazarpaint.com' },
            password: { type: 'string', example: 'password123' },
            jabatan: { type: 'string', example: 'KASIR' },
            role: { type: 'string', enum: ['OWNER', 'KARYAWAN'], example: 'KARYAWAN' },
            storeId: { type: 'string', example: 'store-id' }
          }
        },

        // RESPONSE
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Berhasil' },
            data: { type: 'object' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Terjadi kesalahan' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Autentikasi' },
      { name: 'Users', description: 'Manajemen akun' },
      { name: 'Stores', description: 'Manajemen cabang toko' },
      { name: 'Products', description: 'Manajemen produk' },
      { name: 'Stocks', description: 'Manajemen stok' },
      { name: 'Sales', description: 'Transaksi penjualan' },
      { name: 'Purchases', description: 'Transaksi belanja' },
      { name: 'Mutations', description: 'Mutasi stok antar cabang' },
    ],
    paths: {
      // ==================== AUTH ====================
      '/api/auth/register': {
        post: {
          tags: ['Auth'], summary: 'Register akun baru',
          security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/RegisterRequest' } } } },
          responses: {
            201: { description: 'Registrasi berhasil' },
            400: { description: 'Validasi gagal' },
            409: { description: 'Email sudah terdaftar' }
          }
        }
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'], summary: 'Login',
          security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/LoginRequest' } } } },
          responses: {
            200: { description: 'Login berhasil, return token' },
            401: { description: 'Email atau password salah' }
          }
        }
      },

      // ==================== USERS ====================
      '/api/users/me': {
        get: { tags: ['Users'], summary: 'Get profile sendiri', responses: { 200: { description: 'Data profile' } } }
      },
      '/api/users': {
        get: { tags: ['Users'], summary: 'Get semua user (Owner only)', responses: { 200: { description: 'List user' } } },
        post: {
          tags: ['Users'], summary: 'Buat akun baru (Owner only)',
          requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/UserRequest' } } } },
          responses: { 201: { description: 'Akun berhasil dibuat' } }
        }
      },
      '/api/users/{id}': {
        get: { tags: ['Users'], summary: 'Get user by ID (Owner only)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Data user' } } },
        put: { tags: ['Users'], summary: 'Update user (Owner only)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { '$ref': '#/components/schemas/UserRequest' } } } }, responses: { 200: { description: 'User diupdate' } } },
        delete: { tags: ['Users'], summary: 'Hapus user (Owner only)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'User dihapus' } } }
      },

      // ==================== STORES ====================
      '/api/stores': {
        get: { tags: ['Stores'], summary: 'Get semua cabang', responses: { 200: { description: 'List cabang' } } },
        post: { tags: ['Stores'], summary: 'Buat cabang baru (Owner only)', requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/StoreRequest' } } } }, responses: { 201: { description: 'Cabang dibuat' } } }
      },
      '/api/stores/{id}': {
        get: { tags: ['Stores'], summary: 'Get cabang by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Data cabang' } } },
        put: { tags: ['Stores'], summary: 'Update cabang (Owner only)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { '$ref': '#/components/schemas/StoreRequest' } } } }, responses: { 200: { description: 'Cabang diupdate' } } },
        delete: { tags: ['Stores'], summary: 'Hapus cabang (Owner only)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Cabang dihapus' } } }
      },
      '/api/stores/{id}/assign': {
        post: { tags: ['Stores'], summary: 'Assign karyawan ke cabang (Owner only)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { userId: { type: 'string' } } } } } }, responses: { 201: { description: 'Karyawan di-assign' } } },
        delete: { tags: ['Stores'], summary: 'Unassign karyawan dari cabang (Owner only)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { userId: { type: 'string' } } } } } }, responses: { 200: { description: 'Karyawan di-unassign' } } }
      },

      // ==================== PRODUCTS ====================
      '/api/products': {
        get: { tags: ['Products'], summary: 'Get semua produk', parameters: [{ name: 'type', in: 'query', schema: { type: 'string', enum: ['GLOSS', 'PRO', 'SUPER', 'ACCESSORIES'] } }, { name: 'search', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'List produk' } } },
        post: { tags: ['Products'], summary: 'Buat produk baru (Owner only)', requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/ProductRequest' } } } }, responses: { 201: { description: 'Produk dibuat' } } }
      },
      '/api/products/{id}': {
        get: { tags: ['Products'], summary: 'Get produk by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Data produk' } } },
        put: { tags: ['Products'], summary: 'Update produk (Owner only)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { '$ref': '#/components/schemas/ProductRequest' } } } }, responses: { 200: { description: 'Produk diupdate' } } },
        delete: { tags: ['Products'], summary: 'Hapus produk (Owner only)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Produk dihapus' } } }
      },

      // ==================== STOCKS ====================
      '/api/stocks': {
        get: { tags: ['Stocks'], summary: 'Get semua stok', parameters: [{ name: 'storeId', in: 'query', schema: { type: 'string' } }, { name: 'type', in: 'query', schema: { type: 'string' } }, { name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } }], responses: { 200: { description: 'List stok' } } },
        post: { tags: ['Stocks'], summary: 'Update stok', requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/StockRequest' } } } }, responses: { 200: { description: 'Stok diupdate' } } }
      },
      '/api/stocks/summary/{storeId}': {
        get: { tags: ['Stocks'], summary: 'Get summary stok per cabang', parameters: [{ name: 'storeId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Summary stok' } } }
      },
      '/api/stocks/detail/{productId}/{storeId}': {
        get: { tags: ['Stocks'], summary: 'Get stok spesifik produk per cabang', parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'storeId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Data stok' } } }
      },

      // ==================== SALES ====================
      '/api/sales': {
        get: { tags: ['Sales'], summary: 'Get semua transaksi penjualan', parameters: [{ name: 'storeId', in: 'query', schema: { type: 'string' } }, { name: 'type', in: 'query', schema: { type: 'string' } }, { name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }], responses: { 200: { description: 'List penjualan' } } },
        post: { tags: ['Sales'], summary: 'Buat transaksi penjualan', requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/SaleRequest' } } } }, responses: { 201: { description: 'Transaksi disimpan, stok berkurang' } } }
      },
      '/api/sales/{id}': {
        get: { tags: ['Sales'], summary: 'Get transaksi penjualan by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Data transaksi' } } },
        put: { tags: ['Sales'], summary: 'Update transaksi penjualan', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { '$ref': '#/components/schemas/SaleRequest' } } } }, responses: { 200: { description: 'Transaksi diupdate' } } },
        delete: { tags: ['Sales'], summary: 'Hapus transaksi penjualan (Owner only)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Transaksi dihapus, stok dikembalikan' } } }
      },

      // ==================== PURCHASES ====================
      '/api/purchases': {
        get: { tags: ['Purchases'], summary: 'Get semua transaksi belanja', parameters: [{ name: 'storeId', in: 'query', schema: { type: 'string' } }, { name: 'type', in: 'query', schema: { type: 'string' } }, { name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }], responses: { 200: { description: 'List belanja' } } },
        post: { tags: ['Purchases'], summary: 'Buat transaksi belanja', requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/PurchaseRequest' } } } }, responses: { 201: { description: 'Transaksi disimpan, stok bertambah' } } }
      },
      '/api/purchases/{id}': {
        get: { tags: ['Purchases'], summary: 'Get transaksi belanja by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Data transaksi' } } },
        put: { tags: ['Purchases'], summary: 'Update transaksi belanja', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { '$ref': '#/components/schemas/PurchaseRequest' } } } }, responses: { 200: { description: 'Transaksi diupdate' } } },
        delete: { tags: ['Purchases'], summary: 'Hapus transaksi belanja (Owner only)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Transaksi dihapus, stok dikurangi' } } }
      },

      // ==================== MUTATIONS ====================
      '/api/mutations': {
        get: { tags: ['Mutations'], summary: 'Get semua mutasi stok', parameters: [{ name: 'storeId', in: 'query', schema: { type: 'string' } }, { name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }], responses: { 200: { description: 'List mutasi' } } },
        post: { tags: ['Mutations'], summary: 'Buat mutasi stok', requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/MutationRequest' } } } }, responses: { 201: { description: 'Mutasi disimpan, stok dipindah' } } }
      },
      '/api/mutations/{id}': {
        get: { tags: ['Mutations'], summary: 'Get mutasi by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Data mutasi' } } },
        delete: { tags: ['Mutations'], summary: 'Hapus mutasi (Owner only)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Mutasi dihapus, stok di-rollback' } } }
      },
    }
  },
  apis: []
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;