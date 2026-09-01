const prisma = require("../../lib/prisma");
const crypto = require("crypto");
const { hashPassword, comparePassword } = require("../../utils/hash.util");
const { signToken } = require("../../utils/jwt.util");
const {
  validateRegister,
  validateLogin,
} = require("../../utils/validate.util");
const { assertStoreActive } = require("../../utils/store.util");
const { sendOTPEmail } = require("../../utils/email.util");

// ─── REGISTER (TETAP) ───────────────────────────────────────────────────────
const register = async ({ name, email, password, jabatan, role, storeId }) => {
  const errors = validateRegister({ name, email, password, role });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(", ") };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw { statusCode: 409, message: "Email sudah terdaftar" };

  if (role === "KARYAWAN" && !storeId) {
    throw { statusCode: 400, message: "Karyawan wajib memiliki cabang toko" };
  }

  if (storeId) {
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

// ─── LOGIN (TETAP) ──────────────────────────────────────────────────────────
const login = async ({ email, password }) => {
  const errors = validateLogin({ email, password });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(", ") };

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      // BARU: ambil SEMUA relasi UserStore (tanpa filter deletedAt),
      // biar bisa dibedakan "belum pernah di-assign" vs "toko-nya nonaktif"
      stores: {
        include: {
          store: { select: { id: true, isActive: true, deletedAt: true } },
        },
      },
    },
  });

  if (!user) throw { statusCode: 401, message: "Email atau password salah" };

  const valid = await comparePassword(password, user.password);
  if (!valid) throw { statusCode: 401, message: "Email atau password salah" };

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

    // BARU: cek status penempatan toko
    if (user.stores.length === 0) {
      // Kasus 1: belum pernah di-assign ke toko manapun sama sekali
      throw {
        statusCode: 403,
        code: "NO_STORE_ASSIGNED",
        message: "Akun Anda belum di-assign ke cabang manapun. Hubungi Owner untuk penempatan ke cabang toko.",
      };
    }

    const activeStore = user.stores.find(
        (us) => us.store.isActive && !us.store.deletedAt
    );

    if (!activeStore) {
      // Kasus 2: pernah di-assign, tapi tokonya sekarang nonaktif/dihapus
      throw {
        statusCode: 403,
        code: "STORE_INACTIVE",
        message: "Toko cabang Anda sudah tidak aktif. Hubungi Owner untuk penempatan ke cabang lain.",
      };
    }
  }

  const storeId =
      user.role === "KARYAWAN"
          ? user.stores.find((us) => us.store.isActive && !us.store.deletedAt)?.storeId
          : null;

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

// ═════════════════════════════════════════════════════════════════════════════
// BARU: FORGOT PASSWORD, VERIFY OTP, RESET PASSWORD, CHANGE PASSWORD
// ═════════════════════════════════════════════════════════════════════════════

const forgotPassword = async ({ email }) => {
  if (!email) throw { statusCode: 400, message: "Email wajib diisi" };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw { statusCode: 404, message: "Email tidak terdaftar" };

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode, otpExpiry },
  });

  await sendOTPEmail(user.email, otpCode, user.name);

  return {
    message: "Kode OTP telah dikirim ke email Anda",
    email: user.email,
  };
};

const verifyOTP = async ({ email, otpCode }) => {
  if (!email || !otpCode) {
    throw { statusCode: 400, message: "Email dan OTP wajib diisi" };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.otpCode) {
    throw { statusCode: 400, message: "OTP tidak ditemukan, silakan minta ulang" };
  }

  if (new Date() > user.otpExpiry) {
    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: null, otpExpiry: null },
    });
    throw { statusCode: 400, message: "OTP sudah expired, silakan minta ulang" };
  }

  if (user.otpCode !== otpCode) {
    throw { statusCode: 400, message: "Kode OTP salah" };
  }

  return { message: "OTP valid", valid: true };
};

const resetPassword = async ({ email, otpCode, newPassword }) => {
  if (!email || !otpCode || !newPassword) {
    throw { statusCode: 400, message: "Email, OTP, dan password baru wajib diisi" };
  }

  if (newPassword.length < 6) {
    throw { statusCode: 400, message: "Password minimal 6 karakter" };
  }

  // Verifikasi OTP dulu
  await verifyOTP({ email, otpCode });

  const user = await prisma.user.findUnique({ where: { email } });
  const hashed = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      otpCode: null,
      otpExpiry: null,
      emailVerified: true,
    },
  });

  return { message: "Password berhasil direset, silakan login" };
};

const changePassword = async ({ userId, oldPassword, newPassword }) => {
  if (!oldPassword || !newPassword) {
    throw { statusCode: 400, message: "Password lama dan password baru wajib diisi" };
  }

  if (newPassword.length < 6) {
    throw { statusCode: 400, message: "Password baru minimal 6 karakter" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { statusCode: 404, message: "User tidak ditemukan" };

  const valid = await comparePassword(oldPassword, user.password);
  if (!valid) throw { statusCode: 400, message: "Password lama salah" };

  const hashed = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  return { message: "Password berhasil diubah" };
};

module.exports = {
  register,
  login,
  forgotPassword,
  verifyOTP,
  resetPassword,
  changePassword,
};