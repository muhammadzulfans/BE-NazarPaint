const prisma = require('../../lib/prisma');
const { hashPassword, comparePassword } = require('../../utils/hash.util');
const { signToken } = require('../../utils/jwt.util');
const { validateRegister, validateLogin } = require('../../utils/validate.util');

const register = async ({ name, email, password, jabatan, role, storeId }) => {
  // Validasi input
  const errors = validateRegister({ name, email, password, role });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(', ') };

  // Cek email duplikat
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw { statusCode: 409, message: 'Email sudah terdaftar' };

  // Validasi storeId kalau role KARYAWAN
  if (role === 'KARYAWAN' && !storeId) {
    throw { statusCode: 400, message: 'Karyawan wajib memiliki cabang toko' };
  }

  if (storeId) {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw { statusCode: 404, message: 'Cabang toko tidak ditemukan' };
  }

  const hashed = await hashPassword(password);

  // Buat user + assign ke store dalam 1 transaksi
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { 
        name, 
        email, 
        password: hashed, 
        jabatan: jabatan || 'MANAGEMENT', 
        role: role || 'KARYAWAN' 
      },
      select: { id: true, name: true, email: true, jabatan: true, role: true },
    });

    if (storeId) {
      await tx.userStore.create({
        data: { userId: newUser.id, storeId }
      });
    }

    return newUser;
  });

  const token = signToken({ 
    userId: user.id, 
    email: user.email, 
    jabatan: user.jabatan, 
    role: user.role,
    storeId: storeId || null  // null = owner, bisa akses semua
  });

  return { user, token };
};

const login = async ({ email, password }) => {
  // Validasi input
  const errors = validateLogin({ email, password });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(', ') };

  const user = await prisma.user.findUnique({ 
    where: { email },
    include: {
      stores: { select: { storeId: true } } // ambil cabang user
    }
  });
  if (!user) throw { statusCode: 401, message: 'Email atau password salah' };

  const valid = await comparePassword(password, user.password);
  if (!valid) throw { statusCode: 401, message: 'Email atau password salah' };

  // Ambil storeId pertama (karyawan diasumsikan 1 cabang)
  const storeId = user.stores[0]?.storeId || null;

  const token = signToken({ 
    userId: user.id, 
    email: user.email, 
    jabatan: user.jabatan, 
    role: user.role,
    storeId
  });

  const { password: _pw, stores: _stores, ...userWithoutPassword } = user;
  return { user: { ...userWithoutPassword, storeId }, token };
};

module.exports = { register, login };