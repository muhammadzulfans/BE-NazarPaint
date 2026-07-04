const prisma = require('../../lib/prisma');
const { generateOrderNumber } = require('../../utils/generateCode.util');

const VALID_STATUS = ['PENDING', 'RECEIVED', 'CANCELLED'];

const validate = ({ storeId, items, date }) => {
  const errors = [];

  if (!storeId) errors.push('storeId wajib diisi');

  if (!items || !Array.isArray(items) || items.length === 0)
    errors.push('Items belanja wajib diisi minimal 1 produk');

  items?.forEach((item, i) => {
    if (!item.productId) errors.push(`Item ke-${i + 1}: productId wajib diisi`);
    if (!item.quantity || isNaN(item.quantity) || item.quantity <= 0)
      errors.push(`Item ke-${i + 1}: quantity harus angka positif`);
    if (!item.basePrice || isNaN(item.basePrice) || item.basePrice <= 0)
      errors.push(`Item ke-${i + 1}: basePrice harus angka positif`);
  });

  if (date && isNaN(new Date(date).getTime()))
    errors.push('Format tanggal tidak valid');

  return errors;
};

const getAll = async ({ storeId, status, type, search, startDate, endDate, page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;

  const where = {
    ...(storeId && { storeId }),
    ...(status && { status }),
    ...(startDate && endDate && {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }),
    ...(type || search ? {
      items: {
        some: {
          product: {
            ...(type && { type }),
            ...(search && {
              OR: [
                { name: { contains: search } },
                { code: { contains: search } },
              ]
            })
          }
        }
      }
    } : {})
  };

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { date: 'desc' },
      include: {
        store: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: { id: true, code: true, name: true, type: true, unit: true }
            }
          }
        }
      }
    }),
    prisma.purchase.count({ where })
  ]);

  const totalQuantity = purchases.reduce((sum, purchase) =>
    sum + purchase.items.reduce((s, item) => s + item.quantity, 0), 0);
  const totalAmount = purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
  const pendingCount = purchases.filter(p => p.status === 'PENDING').length;

  return {
    data: purchases,
    totalQuantity,
    totalAmount,
    pendingCount,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

const getById = async (id) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      store: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      items: { include: { product: true } }
    }
  });

  if (!purchase) throw { statusCode: 404, message: 'Transaksi belanja tidak ditemukan' };
  return purchase;
};

// CREATE — hanya buat PO, status PENDING, stok BELUM bertambah
const create = async ({ storeId, userId, items, date }) => {
  const errors = validate({ storeId, items, date });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(', ') };

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw { statusCode: 404, message: 'Cabang toko tidak ditemukan' };

  for (const item of items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product) throw { statusCode: 404, message: `Produk ${item.productId} tidak ditemukan` };
  }

  const totalAmount = items.reduce((sum, item) =>
    sum + (parseFloat(item.quantity) * parseInt(item.basePrice)), 0);

  const orderNumber = await generateOrderNumber(storeId, 'purchase');   // ADDED

  const purchase = await prisma.purchase.create({
    data: {
      orderNumber,   // ADDED
      storeId,
      userId,
      totalAmount,
      status: 'PENDING',
      date: date ? new Date(date) : new Date(),
      items: {
        create: items.map(item => ({
          productId: item.productId,
          quantity: parseFloat(item.quantity),
          basePrice: parseInt(item.basePrice),
          totalPrice: parseFloat(item.quantity) * parseInt(item.basePrice)
        }))
      }
    },
    include: {
      store: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      items: {
        include: {
          product: {
            select: { id: true, code: true, name: true, type: true, unit: true }
          }
        }
      }
    }
  });

  return purchase;
};

// RECEIVE — konfirmasi barang diterima, stok baru BERTAMBAH
const receive = async (id, userRole) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { items: true }
  });

  if (!purchase) throw { statusCode: 404, message: 'Transaksi belanja tidak ditemukan' };

  if (purchase.status === 'RECEIVED') {
    throw { statusCode: 400, message: 'PO ini sudah dikonfirmasi diterima sebelumnya' };
  }

  if (purchase.status === 'CANCELLED') {
    throw { statusCode: 400, message: 'PO yang sudah dibatalkan tidak bisa diterima' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Update status & tanggal terima
    const updatedPurchase = await tx.purchase.update({
      where: { id },
      data: { status: 'RECEIVED', receivedAt: new Date() },
      include: {
        store: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        items: { include: { product: true } }
      }
    });

    // Baru sekarang stok bertambah
    for (const item of purchase.items) {
      await tx.stock.upsert({
        where: { productId_storeId: { productId: item.productId, storeId: purchase.storeId } },
        update: { quantity: { increment: item.quantity } },
        create: { productId: item.productId, storeId: purchase.storeId, quantity: item.quantity }
      });
    }

    return updatedPurchase;
  });

  return updated;
};

// CANCEL — batalkan PO, stok tidak berubah (karena belum pernah ditambah)
const cancel = async (id, userRole) => {
  const purchase = await prisma.purchase.findUnique({ where: { id } });

  if (!purchase) throw { statusCode: 404, message: 'Transaksi belanja tidak ditemukan' };

  if (purchase.status === 'RECEIVED') {
    throw { statusCode: 400, message: 'PO yang sudah diterima tidak bisa dibatalkan. Gunakan hapus transaksi jika perlu rollback stok' };
  }

  if (purchase.status === 'CANCELLED') {
    throw { statusCode: 400, message: 'PO ini sudah dibatalkan sebelumnya' };
  }

  return prisma.purchase.update({
    where: { id },
    data: { status: 'CANCELLED' },
    include: {
      store: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      items: { include: { product: true } }
    }
  });
};

const update = async (id, { items, date }, userRole) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { items: true }
  });

  if (!purchase) throw { statusCode: 404, message: 'Transaksi belanja tidak ditemukan' };

  if (purchase.status !== 'PENDING') {
    throw { statusCode: 400, message: 'Hanya PO berstatus PENDING yang bisa diedit' };
  }

  if (userRole === 'KARYAWAN') {
    const today = new Date();
    const purchaseDate = new Date(purchase.date);
    const isToday = purchaseDate.toDateString() === today.toDateString();
    if (!isToday) throw { statusCode: 403, message: 'Karyawan hanya bisa edit transaksi hari ini' };
  }

  if (items) {
    const errors = validate({ storeId: purchase.storeId, items, date });
    if (errors.length > 0) throw { statusCode: 400, message: errors.join(', ') };
  }

  const newItems = items || purchase.items;
  const totalAmount = newItems.reduce((sum, item) =>
    sum + (parseFloat(item.quantity) * parseInt(item.basePrice)), 0);

  // Hapus items lama, buat baru — tidak menyentuh stok karena masih PENDING
  const updated = await prisma.$transaction(async (tx) => {
    await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });

    return tx.purchase.update({
      where: { id },
      data: {
        totalAmount,
        date: date ? new Date(date) : purchase.date,
        items: {
          create: newItems.map(item => ({
            productId: item.productId,
            quantity: parseFloat(item.quantity),
            basePrice: parseInt(item.basePrice),
            totalPrice: parseFloat(item.quantity) * parseInt(item.basePrice)
          }))
        }
      },
      include: {
        store: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        items: { include: { product: true } }
      }
    });
  });

  return updated;
};

const remove = async (id, userRole) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { items: true }
  });

  if (!purchase) throw { statusCode: 404, message: 'Transaksi belanja tidak ditemukan' };

  if (userRole === 'KARYAWAN') {
    throw { statusCode: 403, message: 'Karyawan tidak bisa menghapus transaksi belanja' };
  }

  await prisma.$transaction(async (tx) => {
    // Hanya rollback stok kalau PO sudah RECEIVED (stok pernah ditambah)
    if (purchase.status === 'RECEIVED') {
      for (const item of purchase.items) {
        await tx.stock.update({
          where: { productId_storeId: { productId: item.productId, storeId: purchase.storeId } },
          data: { quantity: { decrement: item.quantity } }
        });
      }
    }

    await tx.purchase.delete({ where: { id } });
  });
};

module.exports = { getAll, getById, create, update, remove, receive, cancel };