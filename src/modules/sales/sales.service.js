const prisma = require('../../lib/prisma');

const validate = ({ storeId, items, date }) => {
  const errors = [];

  if (!storeId) errors.push('storeId wajib diisi');

  if (!items || !Array.isArray(items) || items.length === 0)
    errors.push('Items penjualan wajib diisi minimal 1 produk');

  items?.forEach((item, i) => {
    if (!item.productId) errors.push(`Item ke-${i + 1}: productId wajib diisi`);
    if (!item.quantity || isNaN(item.quantity) || item.quantity <= 0)
      errors.push(`Item ke-${i + 1}: quantity harus angka positif`);
    if (!item.sellPrice || isNaN(item.sellPrice) || item.sellPrice <= 0)
      errors.push(`Item ke-${i + 1}: sellPrice harus angka positif`);
  });

  if (date && isNaN(new Date(date).getTime()))
    errors.push('Format tanggal tidak valid');

  return errors;
};

const getAll = async ({ storeId, type, search, startDate, endDate, page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;

  const where = {
    ...(storeId && { storeId }),
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

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
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
    prisma.sale.count({ where })
  ]);

  // Summary
  const totalQuantity = sales.reduce((sum, sale) =>
    sum + sale.items.reduce((s, item) => s + item.quantity, 0), 0);
  const totalAmount = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

  return {
    data: sales,
    totalQuantity,
    totalAmount,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

const getById = async (id) => {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      store: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      items: {
        include: {
          product: true
        }
      }
    }
  });

  if (!sale) throw { statusCode: 404, message: 'Transaksi penjualan tidak ditemukan' };
  return sale;
};

const create = async ({ storeId, userId, customerName, items, date }) => {
  const errors = validate({ storeId, items, date });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(', ') };

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw { statusCode: 404, message: 'Cabang toko tidak ditemukan' };

  for (const item of items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product) throw { statusCode: 404, message: `Produk ${item.productId} tidak ditemukan` };

    const stock = await prisma.stock.findUnique({
      where: { productId_storeId: { productId: item.productId, storeId } }
    });

    if (!stock || stock.quantity < item.quantity) {
      throw {
        statusCode: 400,
        message: `Stok ${product.name} tidak mencukupi. Stok tersedia: ${stock?.quantity || 0} ${product.unit}`
      };
    }
  }

  const totalAmount = items.reduce((sum, item) =>
    sum + (parseFloat(item.quantity) * parseInt(item.sellPrice)), 0);

  const sale = await prisma.$transaction(async (tx) => {
    const newSale = await tx.sale.create({
      data: {
        storeId,
        userId,
        customerName: customerName?.trim() || null,   // NEW
        totalAmount,
        date: date ? new Date(date) : new Date(),
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: parseFloat(item.quantity),
            sellPrice: parseInt(item.sellPrice),
            totalPrice: parseFloat(item.quantity) * parseInt(item.sellPrice)
          }))
        }
      },
      include: {
        store: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: { id: true, code: true, name: true, type: true, unit: true, color: true }
            }
          }
        }
      }
    });

    for (const item of items) {
      await tx.stock.update({
        where: { productId_storeId: { productId: item.productId, storeId } },
        data: { quantity: { decrement: parseFloat(item.quantity) } }
      });
    }

    return newSale;
  });

  return sale;
};

const update = async (id, { items, date, customerName }, userId, userRole) => {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { items: true }
  });

  if (!sale) throw { statusCode: 404, message: 'Transaksi penjualan tidak ditemukan' };

  if (userRole === 'KARYAWAN') {
    const today = new Date();
    const saleDate = new Date(sale.date);
    const isToday = saleDate.toDateString() === today.toDateString();
    if (!isToday) throw { statusCode: 403, message: 'Karyawan hanya bisa edit transaksi hari ini' };
  }

  if (items) {
    const errors = validate({ storeId: sale.storeId, items, date });
    if (errors.length > 0) throw { statusCode: 400, message: errors.join(', ') };
  }

  const updatedSale = await prisma.$transaction(async (tx) => {
    for (const oldItem of sale.items) {
      await tx.stock.update({
        where: { productId_storeId: { productId: oldItem.productId, storeId: sale.storeId } },
        data: { quantity: { increment: oldItem.quantity } }
      });
    }

    await tx.saleItem.deleteMany({ where: { saleId: id } });

    const newItems = items || sale.items;
    const totalAmount = newItems.reduce((sum, item) =>
      sum + (parseFloat(item.quantity) * parseInt(item.sellPrice)), 0);

    const updated = await tx.sale.update({
      where: { id },
      data: {
        totalAmount,
        date: date ? new Date(date) : sale.date,
        ...(customerName !== undefined && { customerName: customerName?.trim() || null }), // NEW
        items: {
          create: newItems.map(item => ({
            productId: item.productId,
            quantity: parseFloat(item.quantity),
            sellPrice: parseInt(item.sellPrice),
            totalPrice: parseFloat(item.quantity) * parseInt(item.sellPrice)
          }))
        }
      },
      include: {
        store: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        items: { include: { product: true } }
      }
    });

    for (const item of newItems) {
      await tx.stock.update({
        where: { productId_storeId: { productId: item.productId, storeId: sale.storeId } },
        data: { quantity: { decrement: parseFloat(item.quantity) } }
      });
    }

    return updated;
  });

  return updatedSale;
};

const remove = async (id, userRole) => {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { items: true }
  });

  if (!sale) throw { statusCode: 404, message: 'Transaksi penjualan tidak ditemukan' };

  // Karyawan tidak bisa hapus transaksi
  if (userRole === 'KARYAWAN') {
    throw { statusCode: 403, message: 'Karyawan tidak bisa menghapus transaksi penjualan' };
  }

  await prisma.$transaction(async (tx) => {
    // Kembalikan stok
    for (const item of sale.items) {
      await tx.stock.update({
        where: { productId_storeId: { productId: item.productId, storeId: sale.storeId } },
        data: { quantity: { increment: item.quantity } }
      });
    }

    await tx.sale.delete({ where: { id } });
  });
};

module.exports = { getAll, getById, create, update, remove };