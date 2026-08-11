const prisma = require("../lib/prisma");

/**
 * Memastikan store masih aktif (tidak di-soft-delete).
 * Digunakan saat membuat transaksi baru, mutasi, PO, dsb.
 */
const assertStoreActive = async (storeId) => {
  const store = await prisma.store.findFirst({
    where: { id: storeId, deletedAt: null },
  });
  if (!store) {
    throw {
      statusCode: 400,
      message: "Cabang tidak ditemukan atau sudah tidak aktif",
    };
  }
  return store;
};

module.exports = { assertStoreActive };