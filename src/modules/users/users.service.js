const prisma = require("../../lib/prisma");
const { hashPassword } = require("../../utils/hash.util");
const { assertStoreActive } = require("../../utils/store.util");
const fs = require("fs");
const path = require("path");

// ─── Helper hapus file avatar lama ───────────────────────────────────────────

const deleteOldAvatar = (avatarPath) => {
  if (!avatarPath || avatarPath.includes("default.jpg")) return;
  const fullPath = path.join(process.cwd(), "public", avatarPath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

// ─── SELECT fields yang konsisten (termasuk avatar) ──────────────────────────

const userSelect = {
  id: true,
  name: true,
  email: true,
  jabatan: true,
  role: true,
  avatar: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  stores: {
    include: {
      store: { select: { id: true, name: true, isActive: true, deletedAt: true } },
    },
  },
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

const getAll = async ({ search, role, page = 1, limit = 10 } = {}, excludeUserId) => {
  const skip = (page - 1) * limit;

  const where = {
    ...(excludeUserId && { id: { not: excludeUserId } }),
    ...(role && { role }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { email: { contains: search } },
        { jabatan: { contains: search } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
      select: userSelect,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });

  if (!user) throw { statusCode: 404, message: "User tidak ditemukan" };
  return user;
};

const create = async ({ name, email, password, jabatan, role, storeId }) => {
  if (!name || name.trim().length < 2)
    throw { statusCode: 400, message: 'Nama minimal 2 karakter' };
  if (!email || !email.includes('@'))
    throw { statusCode: 400, message: 'Email tidak valid' };
  if (!password || password.length < 6)
    throw { statusCode: 400, message: 'Password minimal 6 karakter' };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw { statusCode: 409, message: 'Email sudah terdaftar' };

  // Pastikan cabang aktif sebelum assign user baru
  if (storeId) {
    await assertStoreActive(storeId);
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      jabatan: jabatan?.trim() || 'KASIR',
      role: role || 'KARYAWAN',
      status: 'PENDING',   // selalu PENDING saat create
    },
  });

  // Auto-assign ke cabang kalau storeId dikirim
  if (storeId) {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw { statusCode: 404, message: 'Cabang tidak ditemukan' };

    await prisma.userStore.create({
      data: { userId: user.id, storeId },
    });
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    jabatan: user.jabatan,
    role: user.role,
    status: user.status,
    storeId: storeId || null,
  };
};

const update = async (
  id,
  { name, email, password, jabatan, role, storeId },
) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw { statusCode: 404, message: "User tidak ditemukan" };

  if (email && email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw { statusCode: 409, message: "Email sudah digunakan" };
  }

  if (role && !["OWNER", "KARYAWAN"].includes(role)) {
    throw { statusCode: 400, message: "Role harus OWNER atau KARYAWAN" };
  }

  const data = {
    ...(name && { name: name.trim() }),
    ...(email && { email: email.trim() }),
    ...(jabatan && { jabatan }),
    ...(role && { role }),
  };

  if (password) {
    data.password = await hashPassword(password);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id },
      data,
      select: userSelect,
    });

    if (storeId) {
      // Pastikan cabang aktif sebelum re-assign user
      await assertStoreActive(storeId);

      const store = await tx.store.findUnique({ where: { id: storeId } });
      if (!store)
        throw { statusCode: 404, message: "Cabang toko tidak ditemukan" };

      await tx.userStore.deleteMany({ where: { userId: id } });
      await tx.userStore.create({ data: { userId: id, storeId } });
    }

    return updatedUser;
  });

  return updated;
};

const updateStatus = async (id, status) => {
  const VALID_STATUS = ['PENDING', 'ACTIVE', 'INACTIVE', 'RESIGN'];

  if (!VALID_STATUS.includes(status))
    throw { statusCode: 400, message: `Status tidak valid. Pilihan: ${VALID_STATUS.join(', ')}` };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw { statusCode: 404, message: 'User tidak ditemukan' };

  if (user.role === 'OWNER')
    throw { statusCode: 400, message: 'Status OWNER tidak bisa diubah' };

  // Validasi transisi status yang masuk akal
  const validTransitions = {
    PENDING:  ['ACTIVE'],
    ACTIVE:   ['INACTIVE', 'RESIGN'],
    INACTIVE: ['ACTIVE', 'RESIGN'],
    RESIGN:   [], // resign tidak bisa balik
  };

  if (!validTransitions[user.status].includes(status)) {
    throw {
      statusCode: 400,
      message: `Tidak bisa mengubah status dari ${user.status} ke ${status}`,
    };
  }

  return prisma.user.update({
    where: { id },
    data: { status },
    select: {
      id: true, name: true, email: true,
      jabatan: true, role: true, status: true,
    },
  });
};

const remove = async (id, currentUserId) => {
  if (id === currentUserId) {
    throw { statusCode: 400, message: "Tidak bisa menghapus akun sendiri" };
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw { statusCode: 404, message: "User tidak ditemukan" };

  // Hapus file avatar kalau bukan default
  deleteOldAvatar(user.avatar);

  await prisma.user.delete({ where: { id } });
};

// ─── AVATAR ───────────────────────────────────────────────────────────────────

// Upload avatar — user sendiri atau OWNER untuk user lain
const updateAvatar = async (targetUserId, file) => {
  if (!file) throw { statusCode: 400, message: "File foto tidak ditemukan" };

  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw { statusCode: 404, message: "User tidak ditemukan" };

  // Hapus avatar lama kalau bukan default
  deleteOldAvatar(user.avatar);

  // Path relatif untuk disimpan di DB dan diakses FE
  const avatarPath = `uploads/avatars/${file.filename}`;

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { avatar: avatarPath },
    select: userSelect,
  });

  return updated;
};

// Hapus avatar — kembalikan ke default
const deleteAvatar = async (targetUserId) => {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw { statusCode: 404, message: "User tidak ditemukan" };

  deleteOldAvatar(user.avatar);

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { avatar: "uploads/avatars/default.jpg" },
    select: userSelect,
  });

  return updated;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  updateAvatar,
  deleteAvatar,
  updateStatus,
};