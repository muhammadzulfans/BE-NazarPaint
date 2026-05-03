const prisma = require('../../lib/prisma');
const { hashPassword } = require('../../utils/hash.util')

const getAllUsers = async () => {
    return prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
        },
    });
};

const getUserById = async (id) => {
    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
        },
    });
    if (!user) throw { statusCode: 404, message: 'User tidak ditemukan' };
    return user;
};

const createUser = async ({ name, email, password, role }) => {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
        throw {
        statusCode: 409,
            message: 'Email sudah terdaftar'
    };

    const hashed = await hashPassword(password);
    return prisma.user.create({
        data: {
            name,
            email,
            password: hashed,
            role: role || 'EMPLOYEE'
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true
        }
    });
};

const updateUser = async (id, data) => {
    if (data.password) {
        data.password = await hashPassword(data.password);
    }
    return prisma.user.update({
        where: { id },
        data,
        select: {
            id: true,
            name: true,
            email: true,
            role: true
        }
    });
};

const deleteUser = async (id) => {
    return prisma.user.delete({ where: { id } });
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };

