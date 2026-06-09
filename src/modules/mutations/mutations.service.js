const prisma = require('../../lib/prisma');

const validate = ({ fromStoreId, toStoreId, items, date }) => {
  const errors = [];

  if (!fromStoreId) errors.push('fromStoreId wajib diisi');
  if (!toStoreId) errors.push('toStoreId wajib diisi');

  if (fromStoreId && toStoreId && fromStoreId === toStoreId)
    errors.push('Cabang asal dan tujuan tidak boleh sama');

  if (!items || !Array.isArray(items) || items.length === 0)
    errors.push('Items mutasi wajib diisi minimal 1 produk');

  items?.forEach((item, i) => {
    if (!item.productId) errors.push(`Item ke-${i + 1}: productId wajib diisi`);
    if (!item.quantity || isNaN(item.quantity) || item.quantity <= 0)
      errors.push(`Item ke-${i + 1}: quantity harus angka positif`);
  });

  if (date && isNaN(new Date(date).getTime()))
    errors.push('Format tanggal tidak valid');

  return errors;
};

const getAll = async ({ storeId, search, startDate, endDate, page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;

  const where = {
    // Filter by storeId — tampilkan mutasi yang melibatkan cabang ini (asal atau tujuan)
    ...(storeId && {
      OR: [
        { fromStoreId: storeId },
        { toStoreId: storeId }
      ]
    }),
    ...(startDate && endDate && {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }),
    ...(search && {
      items: {
        some: {
          product: {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
            ]
          }
        }
      }
    })
  };

  const [mutations, total] = await Promise.all([
    prisma.mutation.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { date: 'desc' },
      include: {
        fromStore: { select: { id: true, name: true } },
        toStore: { select: { id: true, name: true } },
        userFrom: { select: { id: true, name: true } },
        userTo: { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: { id: true, code: true, name: true, type: true, unit: true }
            }
          }
        }
      }
    }),
    prisma.mutation.count({ where })
  ]);

  const totalQuantity = mutations.reduce((sum, mutation) =>
    sum + mutation.items.reduce((s, item) => s + item.quantity, 0), 0);

  return {
    data: mutations,
    totalQuantity,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

const getById = async (id) => {
  const mutation = await prisma.mutation.findUnique({
    where: { id },
    include: {
      fromStore: { select: { id: true, name: true } },
      toStore: { select: { id: true, name: true } },
      userFrom: { select: { id: true, name: true } },
      userTo: { select: { id: true, name: true } },
      items: { include: { product: true } }
    }
  });

  if (!mutation) throw { statusCode: 404, message: 'Data mutasi tidak ditemukan' };
  return mutation;
};

const create = async ({ fromStoreId, toStoreId, userId, items, note, date }) => {
  const errors = validate({ fromStoreId, toStoreId, items, date });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(', ') };

  // Cek kedua store ada
  const fromStore = await prisma.store.findUnique({ where: { id: fromStoreId } });
  if (!fromStore) throw { statusCode: 404, message: 'Cabang asal tidak ditemukan' };

  const toStore = await prisma.store.findUnique({ where: { id: toStoreId } });
  if (!toStore) throw { statusCode: 404, message: 'Cabang tujuan tidak ditemukan' };

  // Cek semua produk & stok cabang asal mencukupi
  for (const item of items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product) throw { statusCode: 404, message: `Produk ${item.productId} tidak ditemukan` };

    const stock = await prisma.stock.findUnique({
      where: { productId_storeId: { productId: item.productId, storeId: fromStoreId } }
    });

    if (!stock || stock.quantity < item.quantity) {
      throw {
        statusCode: 400,
        message: `Stok ${product.name} di ${fromStore.name} tidak mencukupi. Tersedia: ${stock?.quantity || 0} ${product.unit}`
      };
    }
  }

  const mutation = await prisma.$transaction(async (tx) => {
    // 1. Buat mutation
    const newMutation = await tx.mutation.create({
      data: {
        fromStoreId,
        toStoreId,
        userId,
        note: note || null,
        date: date ? new Date(date) : new Date(),
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: parseFloat(item.quantity)
          }))
        }
      },
      include: {
        fromStore: { select: { id: true, name: true } },
        toStore: { select: { id: true, name: true } },
        userFrom: { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: { id: true, code: true, name: true, type: true, unit: true }
            }
          }
        }
      }
    });

    // 2. Kurangi stok cabang asal
    for (const item of items) {
      await tx.stock.update({
        where: { productId_storeId: { productId: item.productId, storeId: fromStoreId } },
        data: { quantity: { decrement: parseFloat(item.quantity) } }
      });
    }

    // 3. Tambah stok cabang tujuan (upsert — kalau belum ada buat baru)
    for (const item of items) {
      await tx.stock.upsert({
        where: { productId_storeId: { productId: item.productId, storeId: toStoreId } },
        update: { quantity: { increment: parseFloat(item.quantity) } },
        create: { productId: item.productId, storeId: toStoreId, quantity: parseFloat(item.quantity) }
      });
    }

    return newMutation;
  });

  return mutation;
};

const remove = async (id, userRole) => {
  if (userRole === 'KARYAWAN') {
    throw { statusCode: 403, message: 'Karyawan tidak bisa menghapus data mutasi' };
  }

  const mutation = await prisma.mutation.findUnique({
    where: { id },
    include: { items: true }
  });

  if (!mutation) throw { statusCode: 404, message: 'Data mutasi tidak ditemukan' };

  await prisma.$transaction(async (tx) => {
    // Rollback — kembalikan stok ke cabang asal, kurangi dari cabang tujuan
    for (const item of mutation.items) {
      await tx.stock.update({
        where: { productId_storeId: { productId: item.productId, storeId: mutation.fromStoreId } },
        data: { quantity: { increment: item.quantity } }
      });

      await tx.stock.update({
        where: { productId_storeId: { productId: item.productId, storeId: mutation.toStoreId } },
        data: { quantity: { decrement: item.quantity } }
      });
    }

    await tx.mutation.delete({ where: { id } });
  });
};

module.exports = { getAll, getById, create, remove };