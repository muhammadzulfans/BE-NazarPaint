const prisma = require('../../lib/prisma');
const { generateOrderNumber } = require('../../utils/generateCode.util');
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
    ...(storeId && {
      OR: [{ fromStoreId: storeId }, { toStoreId: storeId }]
    }),
    ...(startDate && endDate && {
      date: { gte: new Date(startDate), lte: new Date(endDate) }
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
        toStore:   { select: { id: true, name: true } },
        userFrom:  { select: { id: true, name: true } },
        userTo:    { select: { id: true, name: true } },
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
      toStore:   { select: { id: true, name: true } },
      userFrom:  { select: { id: true, name: true } },
      userTo:    { select: { id: true, name: true } },
      items: { include: { product: true } }
    }
  });

  if (!mutation) throw { statusCode: 404, message: 'Data mutasi tidak ditemukan' };
  return mutation;
};

const create = async ({ fromStoreId, toStoreId, userId, items, note, date }) => {
  const errors = validate({ fromStoreId, toStoreId, items, date });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(', ') };

  const fromStore = await prisma.store.findUnique({ where: { id: fromStoreId } });
  if (!fromStore) throw { statusCode: 404, message: 'Cabang asal tidak ditemukan' };

  const toStore = await prisma.store.findUnique({ where: { id: toStoreId } });
  if (!toStore) throw { statusCode: 404, message: 'Cabang tujuan tidak ditemukan' };

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
  const orderNumber = await generateOrderNumber(fromStoreId, 'mutation');   // NEW
  const mutation = await prisma.$transaction(async (tx) => {
    const newMutation = await tx.mutation.create({
      data: {
        orderNumber,   // NEW
        fromStoreId,
        toStoreId,
        userId,
        note: note || null,
        date: date ? new Date(date) : new Date(),
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity:  parseFloat(item.quantity)
          }))
        }
      },
      include: {
        fromStore: { select: { id: true, name: true } },
        toStore:   { select: { id: true, name: true } },
        userFrom:  { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: { id: true, code: true, name: true, type: true, unit: true }
            }
          }
        }
      }
    });

    for (const item of items) {
      await tx.stock.update({
        where: { productId_storeId: { productId: item.productId, storeId: fromStoreId } },
        data: { quantity: { decrement: parseFloat(item.quantity) } }
      });
    }

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

// ─── UPDATE ───────────────────────────────────────────────────────────────────

const update = async (id, { fromStoreId, toStoreId, items, note, date }, userId, userRole) => {
  // 1. Ambil data mutasi lama
  const mutation = await prisma.mutation.findUnique({
    where: { id },
    include: { items: true }
  });

  if (!mutation) throw { statusCode: 404, message: 'Data mutasi tidak ditemukan' };

  // 2. Karyawan hanya bisa edit mutasi hari ini
  if (userRole === 'KARYAWAN') {
    const today = new Date();
    const mutationDate = new Date(mutation.date);
    if (mutationDate.toDateString() !== today.toDateString()) {
      throw { statusCode: 403, message: 'Karyawan hanya bisa edit mutasi hari ini' };
    }
  }

  // 3. Gunakan nilai lama jika tidak diisi
  const finalFromStoreId = fromStoreId || mutation.fromStoreId;
  const finalToStoreId   = toStoreId   || mutation.toStoreId;
  const finalItems       = items        || mutation.items;
  const finalDate        = date ? new Date(date) : mutation.date;

  // 4. Validasi
  const errors = validate({
    fromStoreId: finalFromStoreId,
    toStoreId:   finalToStoreId,
    items:       finalItems,
    date,
  });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(', ') };

  // 5. Cek store ada
  const fromStore = await prisma.store.findUnique({ where: { id: finalFromStoreId } });
  if (!fromStore) throw { statusCode: 404, message: 'Cabang asal tidak ditemukan' };

  const toStore = await prisma.store.findUnique({ where: { id: finalToStoreId } });
  if (!toStore) throw { statusCode: 404, message: 'Cabang tujuan tidak ditemukan' };

  // 6. Validasi kecukupan stok items baru
  //    Perhitungkan rollback item lama yang produknya sama & fromStore-nya sama
  for (const item of finalItems) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product) throw { statusCode: 404, message: `Produk ${item.productId} tidak ditemukan` };

    const stock = await prisma.stock.findUnique({
      where: { productId_storeId: { productId: item.productId, storeId: finalFromStoreId } }
    });

    // Jika fromStore tidak berubah, stok efektif = stok saat ini + qty lama (karena akan di-rollback)
    const oldItem = mutation.fromStoreId === finalFromStoreId
      ? mutation.items.find((o) => o.productId === item.productId)
      : null;
    const rollbackQty  = oldItem ? oldItem.quantity : 0;
    const effectiveQty = (stock?.quantity || 0) + rollbackQty;

    if (effectiveQty < parseFloat(item.quantity)) {
      throw {
        statusCode: 400,
        message: `Stok ${product.name} di ${fromStore.name} tidak mencukupi. Tersedia: ${effectiveQty} ${product.unit}`
      };
    }
  }

  // 7. Transaction
  const updated = await prisma.$transaction(async (tx) => {
    // a. Rollback stok lama
    for (const oldItem of mutation.items) {
      await tx.stock.update({
        where: { productId_storeId: { productId: oldItem.productId, storeId: mutation.fromStoreId } },
        data: { quantity: { increment: oldItem.quantity } }
      });
      await tx.stock.update({
        where: { productId_storeId: { productId: oldItem.productId, storeId: mutation.toStoreId } },
        data: { quantity: { decrement: oldItem.quantity } }
      });
    }

    // b. Hapus items lama
    await tx.mutationItem.deleteMany({ where: { mutationId: id } });

    // c. Update mutation + buat items baru
    const updatedMutation = await tx.mutation.update({
      where: { id },
      data: {
        fromStoreId: finalFromStoreId,
        toStoreId:   finalToStoreId,
        note:        note !== undefined ? note : mutation.note,
        date:        finalDate,
        items: {
          create: finalItems.map((item) => ({
            productId: item.productId,
            quantity:  parseFloat(item.quantity),
          })),
        },
      },
      include: {
        fromStore: { select: { id: true, name: true } },
        toStore:   { select: { id: true, name: true } },
        userFrom:  { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: { id: true, code: true, name: true, type: true, unit: true },
            },
          },
        },
      },
    });

    // d. Apply stok baru
    for (const item of finalItems) {
      await tx.stock.update({
        where: { productId_storeId: { productId: item.productId, storeId: finalFromStoreId } },
        data: { quantity: { decrement: parseFloat(item.quantity) } }
      });
      await tx.stock.upsert({
        where: { productId_storeId: { productId: item.productId, storeId: finalToStoreId } },
        update: { quantity: { increment: parseFloat(item.quantity) } },
        create: { productId: item.productId, storeId: finalToStoreId, quantity: parseFloat(item.quantity) }
      });
    }

    return updatedMutation;
  });

  return updated;
};

// ─── REMOVE ───────────────────────────────────────────────────────────────────

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

module.exports = { getAll, getById, create, update, remove };