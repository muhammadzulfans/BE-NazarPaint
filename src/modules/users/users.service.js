const prisma = require('../../lib/prisma');

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

module.exports = { getAllUsers, getUserById };