const prisma = require('../../lib/prisma');

// Get semua stok — bisa filter by storeId, type, search, dan date range
const getAll = async ({ storeId, type, search, startDate, endDate } = {}) => {
  const stocks = await prisma.stock.findMany({
    where: {
      ...(storeId && { storeId }),
      product: {
        ...(type && { type }),
        ...(search && {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
          ]
        })
      },
      ...(startDate && endDate && {
        updatedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        }
      })
    },
    include: {
      product: true,
      store: { select: { id: true, name: true } }
    },
    orderBy: { product: { code: 'asc' } }
  });

  const totalQuantity = stocks.reduce((sum, s) => sum + s.quantity, 0);
  const lowStock = stocks.filter(s => s.quantity > 0 && s.quantity <= 10);

  return { stocks, totalQuantity, lowStockCount: lowStock.length };
};

// Get stok by store — untuk summary card di UI
const getSummaryByStore = async (storeId) => {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw { statusCode: 404, message: 'Cabang toko tidak ditemukan' };

  const stocks = await prisma.stock.findMany({
    where: { storeId },
    include: { product: true }
  });

  const totalQuantity = stocks.reduce((sum, s) => sum + s.quantity, 0);
  const lowStock = stocks.filter(s => s.quantity > 0 && s.quantity <= 10);
  const emptyStock = stocks.filter(s => s.quantity === 0);

  return {
    store,
    totalProducts: stocks.length,
    totalQuantity,
    lowStockCount: lowStock.length,
    emptyStockCount: emptyStock.length,
    stocks
  };
};

// Tambah atau update stok (upsert)
// Dipakai saat purchase masuk atau manual adjustment
const upsertStock = async ({ productId, storeId, quantity, mode = 'SET' }) => {
  // Validasi
  if (!productId) throw { statusCode: 400, message: 'productId wajib diisi' };
  if (!storeId) throw { statusCode: 400, message: 'storeId wajib diisi' };
  if (quantity === undefined || isNaN(quantity) || quantity < 0)
    throw { statusCode: 400, message: 'Quantity harus berupa angka positif' };

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw { statusCode: 404, message: 'Produk tidak ditemukan' };

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw { statusCode: 404, message: 'Cabang toko tidak ditemukan' };

  const existing = await prisma.stock.findUnique({
    where: { productId_storeId: { productId, storeId } }
  });

  let finalQuantity;

  if (mode === 'ADD') {
    finalQuantity = (existing?.quantity || 0) + parseFloat(quantity);
  } else if (mode === 'SUBTRACT') {
    finalQuantity = (existing?.quantity || 0) - parseFloat(quantity);
    if (finalQuantity < 0)
      throw { statusCode: 400, message: 'Stok tidak mencukupi' };
  } else {
    // SET — langsung set ke nilai tertentu
    finalQuantity = parseFloat(quantity);
  }

  return prisma.stock.upsert({
    where: { productId_storeId: { productId, storeId } },
    update: { quantity: finalQuantity },
    create: { productId, storeId, quantity: finalQuantity },
    include: {
      product: true,
      store: { select: { id: true, name: true } }
    }
  });
};

// Get stok spesifik 1 produk di 1 cabang
const getByProductAndStore = async (productId, storeId) => {
  const stock = await prisma.stock.findUnique({
    where: { productId_storeId: { productId, storeId } },
    include: {
      product: true,
      store: { select: { id: true, name: true } }
    }
  });

  if (!stock) throw { statusCode: 404, message: 'Data stok tidak ditemukan' };
  return stock;
};

module.exports = { getAll, getSummaryByStore, upsertStock, getByProductAndStore };