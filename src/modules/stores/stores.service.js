const prisma = require('../../lib/prisma');

const getAll = async ({ search, page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search } },
        { address: { contains: search } },
      ]
    })
  };

  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, stocks: true } }
      }
    }),
    prisma.store.count({ where })
  ]);

  return {
    data: stores,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

const getById = async (id) => {
  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      users: {
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, jabatan: true }
          }
        }
      }
    }
  });

  if (!store) throw { statusCode: 404, message: 'Cabang toko tidak ditemukan' };
  return store;
};

const create = async ({ name, address }) => {
  if (!name || name.trim().length < 2) {
    throw { statusCode: 400, message: 'Nama toko minimal 2 karakter' };
  }

  const existing = await prisma.store.findFirst({ where: { name: name.trim() } });
  if (existing) throw { statusCode: 409, message: 'Nama toko sudah ada' };

  return prisma.store.create({
    data: { name: name.trim(), address: address?.trim() || null }
  });
};

const update = async (id, { name, address }) => {
  const store = await prisma.store.findUnique({ where: { id } });
  if (!store) throw { statusCode: 404, message: 'Cabang toko tidak ditemukan' };

  if (name && name.trim() !== store.name) {
    const existing = await prisma.store.findFirst({ where: { name: name.trim() } });
    if (existing) throw { statusCode: 409, message: 'Nama toko sudah ada' };
  }

  return prisma.store.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(address !== undefined && { address: address?.trim() || null })
    }
  });
};

const remove = async (id) => {
  const store = await prisma.store.findUnique({
    where: { id },
    include: { _count: { select: { stocks: true, salesFrom: true, purchasesFrom: true } } }
  });

  if (!store) throw { statusCode: 404, message: 'Cabang toko tidak ditemukan' };

  // Cegah hapus kalau masih ada transaksi
  if (store._count.salesFrom > 0 || store._count.purchasesFrom > 0) {
    throw { statusCode: 400, message: 'Tidak bisa hapus toko yang sudah memiliki transaksi' };
  }

  return prisma.store.delete({ where: { id } });
};

// Assign karyawan ke cabang
const assignUser = async (storeId, userId) => {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw { statusCode: 404, message: 'Cabang toko tidak ditemukan' };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { statusCode: 404, message: 'User tidak ditemukan' };

  const existing = await prisma.userStore.findUnique({
    where: { userId_storeId: { userId, storeId } }
  });
  if (existing) throw { statusCode: 409, message: 'User sudah terdaftar di cabang ini' };

  return prisma.userStore.create({ data: { userId, storeId } });
};

// Hapus karyawan dari cabang
const unassignUser = async (storeId, userId) => {
  const existing = await prisma.userStore.findUnique({
    where: { userId_storeId: { userId, storeId } }
  });
  if (!existing) throw { statusCode: 404, message: 'User tidak terdaftar di cabang ini' };

  return prisma.userStore.delete({
    where: { userId_storeId: { userId, storeId } }
  });
};

module.exports = { getAll, getById, create, update, remove, assignUser, unassignUser };