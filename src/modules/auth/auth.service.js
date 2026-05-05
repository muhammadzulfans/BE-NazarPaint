const prisma = require('../../lib/prisma');
const { hashPassword, comparePassword } = require('../../utils/hash.util');
const { signToken } = require('../../utils/jwt.util');

const register = async ({ name, email, password, jabatan, role }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw { statusCode: 409, message: 'Email sudah terdaftar' };

  const hashed = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, jabatan, role: role || 'EMPLOYEE' },
    select: { id: true, name: true, email: true, jabatan: true, role: true },
  });

  const token = signToken({ userId: user.id, email: user.email, jabatan: user.jabatan, role: user.role });
  return { user, token };
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw { statusCode: 401, message: 'Email atau password salah' };

  const valid = await comparePassword(password, user.password);
  if (!valid) throw { statusCode: 401, message: 'Email atau password salah' };

  const token = signToken({ userId: user.id, email: user.email, jabatan: user.jabatan, role: user.role });
  const { password: _pw, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

module.exports = { register, login };