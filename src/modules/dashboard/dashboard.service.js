const prisma = require("../../lib/prisma");

// ??? Helper: rentang waktu ???

function getRangeToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getRangeThisWeek() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMon);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getRangeThisMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return { start, end };
}

function getRangeLastMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return { start, end };
}

// Buat filter storeId: OWNER bisa opsional, KARYAWAN wajib sesuai cabang sendiri
async function buildStoreFilter(user, storeId) {
  if (user.role === "OWNER") {
    return storeId ? { storeId } : {};
  }
  const userStoreId = user.storeId;
  if (!userStoreId) {
    throw {
      statusCode: 403,
      code: "NO_STORE_ASSIGNED",
      message: "Akun karyawan belum di-assign ke cabang manapun. Hubungi Admin.",
    };
  }

  // BARU: pastikan toko yang di-assign masih aktif
  const store = await prisma.store.findUnique({
    where: { id: userStoreId },
    select: { id: true, isActive: true, deletedAt: true },
  });

  if (!store || !store.isActive || store.deletedAt) {
    throw {
      statusCode: 403,
      code: "STORE_INACTIVE",
      message: "Toko cabang Anda sudah tidak aktif. Hubungi Admin untuk penempatan ulang.",
    };
  }

  return { storeId: userStoreId };
}

// ??? 1. Ringkasan Produk ???

async function getProductSummary() {
  const [total, byCategory] = await Promise.all([
    prisma.product.count(),
    prisma.product.groupBy({
      by: ["type"],
      _count: { id: true },
    }),
  ]);

  const categories = byCategory.map((g) => ({
    type: g.type,
    total: g._count.id,
  }));

  return { totalProduct: total, categories };
}

// ??? 2. Ringkasan Penjualan ???

async function getSalesSummary(user, storeId) {
  const storeFilter = await buildStoreFilter(user, storeId);
  const { start: todayStart, end: todayEnd } = getRangeToday();
  const { start: weekStart, end: weekEnd } = getRangeThisWeek();
  const { start: monthStart, end: monthEnd } = getRangeThisMonth();

  const baseWhere = { ...storeFilter };

  const [today, thisWeek, thisMonth] = await Promise.all([
    prisma.sale.aggregate({
      where: { ...baseWhere, createdAt: { gte: todayStart, lte: todayEnd } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    prisma.sale.aggregate({
      where: { ...baseWhere, createdAt: { gte: weekStart, lte: weekEnd } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    prisma.sale.aggregate({
      where: { ...baseWhere, createdAt: { gte: monthStart, lte: monthEnd } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
  ]);

  return {
    today: {
      totalAmount: today._sum.totalAmount || 0,
      totalTransaction: today._count.id,
    },
    thisWeek: {
      totalAmount: thisWeek._sum.totalAmount || 0,
      totalTransaction: thisWeek._count.id,
    },
    thisMonth: {
      totalAmount: thisMonth._sum.totalAmount || 0,
      totalTransaction: thisMonth._count.id,
    },
  };
}

// ??? 3. Penjualan Mingguan (7 hari terakhir) ???

async function getWeeklySalesTrend(user, storeId) {
  const storeFilter = await buildStoreFilter(user, storeId);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const start = new Date(d.setHours(0, 0, 0, 0));
    const end = new Date(new Date(start).setHours(23, 59, 59, 999));
    days.push({ label: start.toISOString().slice(0, 10), start, end });
  }

  const results = await Promise.all(
    days.map(({ label, start, end }) =>
      prisma.sale
        .aggregate({
          where: { ...storeFilter, createdAt: { gte: start, lte: end } },
          _sum: { totalAmount: true },
          _count: { id: true },
        })
        .then((agg) => ({
          date: label,
          totalAmount: agg._sum.totalAmount || 0,
          totalTransaction: agg._count.id,
        })),
    ),
  );

  return results;
}

// ??? 4. Penjualan Bulanan (12 bulan terakhir) ???

async function getMonthlySalesTrend(user, storeId) {
  const storeFilter = await buildStoreFilter(user, storeId);
  const now = new Date();

  const months = [];
  for (let i = 11; i >= 0; i--) {
    const year = now.getFullYear();
    const month = now.getMonth() - i;
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const label = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    months.push({ label, start, end });
  }

  const results = await Promise.all(
    months.map(({ label, start, end }) =>
      prisma.sale
        .aggregate({
          where: { ...storeFilter, createdAt: { gte: start, lte: end } },
          _sum: { totalAmount: true },
          _count: { id: true },
        })
        .then((agg) => ({
          month: label,
          totalAmount: agg._sum.totalAmount || 0,
          totalTransaction: agg._count.id,
        })),
    ),
  );

  return results;
}

// ??? 5. Rekap Akhir Bulan ???

async function getEndOfMonthRecap(user, storeId) {
  const storeFilter = await buildStoreFilter(user, storeId);
  const { start: thisMonthStart, end: thisMonthEnd } = getRangeThisMonth();
  const { start: lastMonthStart, end: lastMonthEnd } = getRangeLastMonth();

  const [salesThis, salesLast, purchasesThis, purchasesLast, topProducts] =
    await Promise.all([
      // Penjualan bulan ini
      prisma.sale.aggregate({
        where: {
          ...storeFilter,
          createdAt: { gte: thisMonthStart, lte: thisMonthEnd },
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      // Penjualan bulan lalu
      prisma.sale.aggregate({
        where: {
          ...storeFilter,
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      // Pembelian bulan ini
      prisma.purchase.aggregate({
        where: {
          ...storeFilter,
          status: "RECEIVED",
          createdAt: { gte: thisMonthStart, lte: thisMonthEnd },
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      // Pembelian bulan lalu
      prisma.purchase.aggregate({
        where: {
          ...storeFilter,
          status: "RECEIVED",
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      // Top 5 produk terlaris bulan ini
      prisma.saleItem.groupBy({
        by: ["productId"],
        where: {
          sale: {
            ...storeFilter,
            createdAt: { gte: thisMonthStart, lte: thisMonthEnd },
          },
        },
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
    ]);

  // Resolve nama produk untuk top products
  const productIds = topProducts.map((p) => p.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, code: true, type: true, unit: true },
  });
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  const salesAmountThis = salesThis._sum.totalAmount || 0;
  const salesAmountLast = salesLast._sum.totalAmount || 0;
  const salesGrowth =
    salesAmountLast > 0
      ? (((salesAmountThis - salesAmountLast) / salesAmountLast) * 100).toFixed(
          2,
        )
      : null;

  const purchaseAmountThis = purchasesThis._sum.totalAmount || 0;
  const purchaseAmountLast = purchasesLast._sum.totalAmount || 0;
  const purchaseGrowth =
    purchaseAmountLast > 0
      ? (
          ((purchaseAmountThis - purchaseAmountLast) / purchaseAmountLast) *
          100
        ).toFixed(2)
      : null;

  const now = new Date();

  return {
    period: {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      label: `${now.toLocaleString("id-ID", { month: "long" })} ${now.getFullYear()}`,
    },
    sales: {
      thisMonth: {
        totalAmount: salesAmountThis,
        totalTransaction: salesThis._count.id,
      },
      lastMonth: {
        totalAmount: salesAmountLast,
        totalTransaction: salesLast._count.id,
      },
      growthPercent: salesGrowth !== null ? parseFloat(salesGrowth) : null,
    },
    purchases: {
      thisMonth: {
        totalAmount: purchaseAmountThis,
        totalTransaction: purchasesThis._count.id,
      },
      lastMonth: {
        totalAmount: purchaseAmountLast,
        totalTransaction: purchasesLast._count.id,
      },
      growthPercent:
        purchaseGrowth !== null ? parseFloat(purchaseGrowth) : null,
    },
    netProfit: {
      thisMonth: salesAmountThis - purchaseAmountThis,
      lastMonth: salesAmountLast - purchaseAmountLast,
    },
    topProducts: topProducts.map((p) => ({
      product: productMap[p.productId] || { id: p.productId },
      totalQty: p._sum.quantity || 0,
      totalRevenue: p._sum.totalPrice || 0,
    })),
  };
}

// ??? 6. Stok Menipis ???
// FIX: hanya query store yang AKTIF (deletedAt: null) karena stok menipis
// di cabang yang sudah dihapus tidak relevan secara operasional.
async function getLowStockAlert(user, storeId, threshold = 10) {
  const storeFilter = await buildStoreFilter(user, storeId);

  // Cabang yang relevan — hanya yang AKTIF
  const stores = await prisma.store.findMany({
    where: storeFilter.storeId
      ? { id: storeFilter.storeId, deletedAt: null }
      : { deletedAt: null },
    select: { id: true, name: true },
  });

  // Semua produk yang ada di sistem
  const products = await prisma.product.findMany({
    select: { id: true, code: true, name: true, type: true, unit: true },
  });

  // Stock row yang BENERAN ada (dipakai buat lookup)
  const existingStocks = await prisma.stock.findMany({
    where: storeFilter.storeId ? { storeId: storeFilter.storeId } : {},
    select: { storeId: true, productId: true, quantity: true },
  });

  const stockMap = new Map(
    existingStocks.map((s) => [`${s.storeId}_${s.productId}`, s.quantity]),
  );

  // Loop tiap kombinasi cabang x produk, default quantity = 0 kalau row-nya gak ada
  const items = [];
  for (const store of stores) {
    for (const product of products) {
      const quantity = stockMap.get(`${store.id}_${product.id}`) ?? 0;
      if (quantity <= threshold) {
        items.push({
          storeId: store.id,
          storeName: store.name,
          product,
          quantity,
        });
      }
    }
  }

  items.sort((a, b) => a.quantity - b.quantity);

  return {
    threshold,
    totalAlert: items.length,
    items,
  };
}

// ??? 7. Ringkasan per Cabang (OWNER only) ???
// FIX: include SEMUA cabang (aktif maupun dihapus) agar laporan historis tetap lengkap.
// Tambahkan flag isActive & deletedAt agar frontend bisa membedakan.
async function getStoreSummary() {
  const { start: monthStart, end: monthEnd } = getRangeThisMonth();

  const stores = await prisma.store.findMany({
    select: { id: true, name: true, isActive: true, deletedAt: true },
  });

  const summaries = await Promise.all(
    stores.map(async (store) => {
      const [sales, purchases, stockValue] = await Promise.all([
        prisma.sale.aggregate({
          where: {
            storeId: store.id,
            createdAt: { gte: monthStart, lte: monthEnd },
          },
          _sum: { totalAmount: true },
          _count: { id: true },
        }),
        prisma.purchase.aggregate({
          where: {
            storeId: store.id,
            status: "RECEIVED",
            createdAt: { gte: monthStart, lte: monthEnd },
          },
          _sum: { totalAmount: true },
        }),
        prisma.stock.aggregate({
          where: { storeId: store.id },
          _sum: { quantity: true },
        }),
      ]);

      return {
        storeId: store.id,
        storeName: store.name,
        isActive: store.isActive,
        deletedAt: store.deletedAt,
        thisMonth: {
          totalSales: sales._sum.totalAmount || 0,
          totalTransactions: sales._count.id,
          totalPurchases: purchases._sum.totalAmount || 0,
          totalStockQty: stockValue._sum.quantity || 0,
        },
      };
    }),
  );

  return summaries;
}

// ??? 8. Rekap Stok Bulan Ini ???

async function getStockRecap(user, storeId) {
  const storeFilter = await buildStoreFilter(user, storeId);
  const { start: monthStart, end: monthEnd } = getRangeThisMonth();

  const [
    stokOrder, // Purchase PENDING ? belum masuk, masih dipesan
    stokMasuk, // PurchaseItem RECEIVED bulan ini ? masuk gudang
    stokKeluar, // SaleItem bulan ini ? keluar gudang
    stokAkhir, // Stock.quantity saat ini ? sisa stok
  ] = await Promise.all([
    // Total Stok Order = qty di Purchase yang masih PENDING
    prisma.purchaseItem.aggregate({
      where: {
        purchase: {
          ...storeFilter,
          status: "PENDING",
        },
      },
      _sum: { quantity: true },
    }),

    // Total Stok Masuk = qty PurchaseItem yang RECEIVED bulan ini
    prisma.purchaseItem.aggregate({
      where: {
        purchase: {
          ...storeFilter,
          status: "RECEIVED",
          updatedAt: { gte: monthStart, lte: monthEnd },
        },
      },
      _sum: { quantity: true },
    }),

    // Total Stok Keluar = qty SaleItem bulan ini
    prisma.saleItem.aggregate({
      where: {
        sale: {
          ...storeFilter,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      },
      _sum: { quantity: true },
    }),

    // Total Stok Akhir = total quantity di tabel Stock saat ini
    prisma.stock.aggregate({
      where: { ...storeFilter },
      _sum: { quantity: true },
    }),
  ]);

  return {
    totalStokOrder: stokOrder._sum.quantity || 0,
    totalStokMasuk: stokMasuk._sum.quantity || 0,
    totalStokKeluar: stokKeluar._sum.quantity || 0,
    totalStokAkhir: stokAkhir._sum.quantity || 0,
  };
}

// ??? Master: getDashboard ???

async function getDashboard(user, query) {
  const { storeId, lowStockThreshold } = query;
  const threshold = lowStockThreshold ? parseInt(lowStockThreshold) : 10;

  const isOwner = user.role === "OWNER";

  const [
    productSummary,
    salesSummary,
    weeklySales,
    monthlySales,
    endOfMonth,
    lowStock,
    stockRecap,
    storeSummary,
  ] = await Promise.all([
    getProductSummary(),
    getSalesSummary(user, storeId),
    getWeeklySalesTrend(user, storeId),
    getMonthlySalesTrend(user, storeId),
    getEndOfMonthRecap(user, storeId),
    // FIX: jangan teruskan storeId ? card "Stok Hampir Habis" harus selalu
    // total semua cabang (gak ikut ke-filter dropdown cabang di halaman Inventory),
    // konsisten sama getStoreSummary() yang juga selalu global.
    getLowStockAlert(user, null, threshold),
    getStockRecap(user, storeId),
    isOwner ? getStoreSummary() : Promise.resolve(null),
  ]);

  return {
    productSummary,
    salesSummary,
    weeklySalesTrend: weeklySales,
    monthlySalesTrend: monthlySales,
    endOfMonthRecap: endOfMonth,
    stockRecap,
    lowStockAlert: lowStock,
    ...(isOwner && { storeSummary }),
  };
}

module.exports = {
  getDashboard,
  getProductSummary,
  getSalesSummary,
  getWeeklySalesTrend,
  getMonthlySalesTrend,
  getEndOfMonthRecap,
  getStockRecap,
  getLowStockAlert,
  getStoreSummary,
};