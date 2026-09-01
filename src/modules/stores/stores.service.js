const prisma = require("../../lib/prisma");
const { generateStoreCode } = require("../../utils/generateCode.util");

const getAll = async ({ search, page = 1, limit = 10, includeInactive = false } = {}) => {
  const skip = (page - 1) * limit;

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(!includeInactive && { deletedAt: null }),
  };

  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, stocks: true } },
      },
    }),
    prisma.store.count({ where }),
  ]);

  return {
    data: stores,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getById = async (id, { includeInactive = false } = {}) => {
  const store = await prisma.store.findFirst({
    where: {
      id,
      ...(!includeInactive && { deletedAt: null }),
    },
    include: {
      users: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              jabatan: true,
            },
          },
        },
      },
    },
  });

  if (!store) throw { statusCode: 404, message: "Cabang toko tidak ditemukan" };
  return store;
};

// code TIDAK lagi diterima dari body — auto-generate, fully locked
const create = async ({ name, address }) => {
  if (!name || name.trim().length < 2) {
    throw { statusCode: 400, message: "Nama toko minimal 2 karakter" };
  }

  // Cek duplikat nama pada store yang masih aktif
  const existing = await prisma.store.findFirst({
    where: { name: name.trim(), deletedAt: null },
  });
  if (existing) throw { statusCode: 409, message: "Nama toko sudah ada" };

  const code = await generateStoreCode(name.trim());

  return prisma.store.create({
    data: {
      name: name.trim(),
      code,
      address: address?.trim() || null,
      isActive: true,
      deletedAt: null,
    },
  });
};

// code TIDAK bisa diubah lewat update — fully locked
const update = async (id, { name, address }) => {
  const store = await prisma.store.findFirst({
    where: { id, deletedAt: null },
  });
  if (!store) throw { statusCode: 404, message: "Cabang toko tidak ditemukan" };

  if (name && name.trim() !== store.name) {
    const existing = await prisma.store.findFirst({
      where: { name: name.trim(), deletedAt: null, NOT: { id } },
    });
    if (existing) throw { statusCode: 409, message: "Nama toko sudah ada" };
  }

  return prisma.store.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(address !== undefined && { address: address?.trim() || null }),
      // code sengaja tidak disentuh sama sekali
    },
  });
};

// SOFT DELETE — data transaksi tetap ada karena storeId tidak berubah
const remove = async (id) => {
  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      users: { select: { userId: true } },
    },
  });

  if (!store) throw { statusCode: 404, message: "Cabang toko tidak ditemukan" };
  if (store.deletedAt) {
    throw { statusCode: 400, message: "Cabang toko sudah dihapus sebelumnya" };
  }

  if (store.users.length > 0) {
    throw {
      statusCode: 400,
      message: `Tidak bisa menonaktifkan toko ini karena masih memiliki ${store.users.length} karyawan ter-assign. Pindahkan atau lepas assignment karyawan terlebih dahulu.`,
    };
  }

  return prisma.store.update({
    where: { id },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });
};

// RESTORE — kembalikan cabang yang di-soft-delete
const restore = async (id) => {
  const store = await prisma.store.findUnique({ where: { id } });
  if (!store) throw { statusCode: 404, message: "Cabang toko tidak ditemukan" };
  if (!store.deletedAt) {
    throw { statusCode: 400, message: "Cabang toko masih aktif" };
  }

  // Cek apakah nama bentrok dengan store aktif lain
  const conflict = await prisma.store.findFirst({
    where: { name: store.name, deletedAt: null, NOT: { id } },
  });
  if (conflict) {
    throw {
      statusCode: 409,
      message: `Tidak bisa restore, nama "${store.name}" sudah dipakai cabang aktif lain`,
    };
  }

  // Cek apakah code bentrok dengan store aktif lain
  const codeConflict = await prisma.store.findFirst({
    where: { code: store.code, deletedAt: null, NOT: { id } },
  });
  if (codeConflict) {
    throw {
      statusCode: 409,
      message: `Tidak bisa restore, kode "${store.code}" sudah dipakai cabang aktif lain`,
    };
  }

  return prisma.store.update({
    where: { id },
    data: { isActive: true, deletedAt: null },
  });
};

const assignUser = async (storeId, userId) => {
  const store = await prisma.store.findFirst({
    where: { id: storeId, deletedAt: null },
  });
  if (!store) throw { statusCode: 404, message: "Cabang toko tidak ditemukan atau sudah tidak aktif" };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { statusCode: 404, message: "User tidak ditemukan" };

  const existing = await prisma.userStore.findUnique({
    where: { userId_storeId: { userId, storeId } },
  });
  if (existing)
    throw { statusCode: 409, message: "User sudah terdaftar di cabang ini" };

  return prisma.userStore.create({ data: { userId, storeId } });
};

const unassignUser = async (storeId, userId) => {
  const existing = await prisma.userStore.findUnique({
    where: { userId_storeId: { userId, storeId } },
  });
  if (!existing)
    throw { statusCode: 404, message: "User tidak terdaftar di cabang ini" };

  return prisma.userStore.delete({
    where: { userId_storeId: { userId, storeId } },
  });
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  restore,
  assignUser,
  unassignUser,
};