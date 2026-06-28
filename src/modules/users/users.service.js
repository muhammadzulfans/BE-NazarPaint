const prisma = require("../../lib/prisma");
const { hashPassword } = require("../../utils/hash.util");
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
  createdAt: true,
  updatedAt: true,
  stores: {
    include: {
      store: { select: { id: true, name: true } },
    },
  },
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

const getAll = async ({ search, role, page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;

  const where = {
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
  const errors = [];

  if (!name || name.trim().length < 2) errors.push("Nama minimal 2 karakter");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push("Format email tidak valid");
  if (!password || password.length < 6)
    errors.push("Password minimal 6 karakter");
  if (role && !["OWNER", "KARYAWAN"].includes(role))
    errors.push("Role harus OWNER atau KARYAWAN");
  if (role === "KARYAWAN" && !storeId)
    errors.push("Karyawan wajib memiliki cabang toko");

  if (errors.length > 0) throw { statusCode: 400, message: errors.join(", ") };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw { statusCode: 409, message: "Email sudah terdaftar" };

  if (storeId) {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store)
      throw { statusCode: 404, message: "Cabang toko tidak ditemukan" };
  }

  const hashed = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        password: hashed,
        jabatan: jabatan || "KARYAWAN",
        role: role || "KARYAWAN",
        avatar: "uploads/avatars/default.jpg",
      },
      select: userSelect,
    });

    if (storeId) {
      await tx.userStore.create({ data: { userId: newUser.id, storeId } });
    }

    return newUser;
  });

  return user;
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
};
