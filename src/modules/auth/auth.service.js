const prisma = require("../../lib/prisma");
const { hashPassword, comparePassword } = require("../../utils/hash.util");
const { signToken } = require("../../utils/jwt.util");
const {
  validateRegister,
  validateLogin,
} = require("../../utils/validate.util");
const { assertStoreActive } = require("../../utils/store.util");

const register = async ({ name, email, password, jabatan, role, storeId }) => {
  const errors = validateRegister({ name, email, password, role });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(", ") };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw { statusCode: 409, message: "Email sudah terdaftar" };

  if (role === "KARYAWAN" && !storeId) {
    throw { statusCode: 400, message: "Karyawan wajib memiliki cabang toko" };
  }

  if (storeId) {
    // Pastikan cabang aktif sebelum assign user baru
    await assertStoreActive(storeId);
  }

  const hashed = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name,
        email,
        password: hashed,
        jabatan: jabatan || "MANAGEMENT",
        role: role || "KARYAWAN",
      },
      select: { id: true, name: true, email: true, jabatan: true, role: true },
    });

    if (storeId) {
      await tx.userStore.create({
        data: { userId: newUser.id, storeId },
      });
    }

    return newUser;
  });

  const token = signToken({
    userId: user.id,
    email: user.email,
    jabatan: user.jabatan,
    role: user.role,
    storeId: storeId || null,
  });

  return { user, token };
};

const login = async ({ email, password }) => {
  const errors = validateLogin({ email, password });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(", ") };

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      stores: {
        where: { store: { deletedAt: null } }, // hanya ambil cabang aktif untuk operasional
        select: { storeId: true },
      },
    },
  });

  // Pesan umum agar tidak bocorkan info email terdaftar/tidak
  if (!user) throw { statusCode: 401, message: "Email atau password salah" };

  const valid = await comparePassword(password, user.password);
  if (!valid) throw { statusCode: 401, message: "Email atau password salah" };

  // ─── Cek status akun ────────────────────────────────────────────────────────
  if (user.role === "KARYAWAN") {
    if (user.status === "PENDING") {
      throw {
        statusCode: 403,
        message:
          "Akun Anda belum diaktifkan. Hubungi Owner untuk mengaktifkan akun.",
      };
    }

    if (user.status === "INACTIVE") {
      throw {
        statusCode: 403,
        message:
          "Akun Anda sedang dinonaktifkan. Hubungi Owner untuk informasi lebih lanjut.",
      };
    }

    if (user.status === "RESIGN") {
      throw {
        statusCode: 403,
        message:
          "Akun Anda sudah tidak aktif (resign). Hubungi Owner jika ada kesalahan.",
      };
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  const storeId = user.stores[0]?.storeId || null;

  const token = signToken({
    userId: user.id,
    email: user.email,
    jabatan: user.jabatan,
    role: user.role,
    status: user.status,
    storeId,
  });

  const { password: _pw, stores: _stores, ...userWithoutPassword } = user;
  return { user: { ...userWithoutPassword, storeId }, token };
};

module.exports = { register, login };