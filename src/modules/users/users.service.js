const prisma = require('../../lib/prisma');
const { hashPassword } = require('../../utils/hash.util');

const getAll = async () => {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      jabatan: true,
      role: true,
      createdAt: true,
      stores: {
        include: {
          store: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

const getById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      jabatan: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      stores: {
        include: {
          store: { select: { id: true, name: true } }
        }
      }
    }
  });

  if (!user) throw { statusCode: 404, message: 'User tidak ditemukan' };
  return user;
};

const create = async ({ name, email, password, jabatan, role, storeId }) => {
  const errors = [];

  if (!name || name.trim().length < 2) errors.push('Nama minimal 2 karakter');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Format email tidak valid');
  if (!password || password.length < 6) errors.push('Password minimal 6 karakter');
  if (role && !['OWNER', 'KARYAWAN'].includes(role)) errors.push('Role harus OWNER atau KARYAWAN');
  if (role === 'KARYAWAN' && !storeId) errors.push('Karyawan wajib memiliki cabang toko');

  if (errors.length > 0) throw { statusCode: 400, message: errors.join(', ') };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw { statusCode: 409, message: 'Email sudah terdaftar' };

  if (storeId) {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw { statusCode: 404, message: 'Cabang toko tidak ditemukan' };
  }

  const hashed = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        password: hashed,
        jabatan: jabatan || 'KARYAWAN',
        role: role || 'KARYAWAN'
      },
      select: {
        id: true, name: true, email: true, jabatan: true, role: true, createdAt: true
      }
    });

    if (storeId) {
      await tx.userStore.create({ data: { userId: newUser.id, storeId } });
    }

    return newUser;
  });

  return user;
};

const update = async (id, { name, email, password, jabatan, role, storeId }) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw { statusCode: 404, message: 'User tidak ditemukan' };

  if (email && email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw { statusCode: 409, message: 'Email sudah digunakan' };
  }

  if (role && !['OWNER', 'KARYAWAN'].includes(role)) {
    throw { statusCode: 400, message: 'Role harus OWNER atau KARYAWAN' };
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
      select: {
        id: true, name: true, email: true, jabatan: true, role: true, updatedAt: true
      }
    });

    // Update cabang kalau ada
    if (storeId) {
      const store = await tx.store.findUnique({ where: { id: storeId } });
      if (!store) throw { statusCode: 404, message: 'Cabang toko tidak ditemukan' };

      // Hapus semua assign lama lalu buat baru
      await tx.userStore.deleteMany({ where: { userId: id } });
      await tx.userStore.create({ data: { userId: id, storeId } });
    }

    return updatedUser;
  });

  return updated;
};

const remove = async (id, currentUserId) => {
  if (id === currentUserId) {
    throw { statusCode: 400, message: 'Tidak bisa menghapus akun sendiri' };
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw { statusCode: 404, message: 'User tidak ditemukan' };

  await prisma.user.delete({ where: { id } });
};

module.exports = { getAll, getById, create, update, remove };