const prisma = require("../../lib/prisma");
const { generateOpnameNumber } = require("../../utils/generateCode.util");

const DEFAULT_COLORS = {
  GLOSS: "#FFD700",
  PRO: "#1E90FF",
  SUPER: "#FF4500",
  ACCESSORIES: "#808080",
};

const PRODUCT_SELECT = {
  id: true,
  code: true,
  name: true,
  type: true,
  unit: true,
  hexColor: true,
};

const applyTransform = (opname) => ({
  ...opname,
  itemCount: opname.items.length,
  totalSelisih: opname.items.reduce((sum, item) => sum + item.selisih, 0),
  items: opname.items.map((item) => ({
    ...item,
    product: {
      ...item.product,
      hexColor:
        item.product.hexColor || DEFAULT_COLORS[item.product.type] || "#CCCCCC",
    },
  })),
});

const getAll = async ({
  storeId,
  status,
  search,
  startDate,
  endDate,
  page = 1,
  limit = 10,
} = {}) => {
  const skip = (page - 1) * limit;

  const where = {
    ...(storeId && { storeId }),
    ...(status && { status }),
    ...(startDate &&
      endDate && {
        date: {
          gte: new Date(`${startDate}T00:00:00.000Z`),
          lte: new Date(`${endDate}T23:59:59.999Z`),
        },
      }),
    ...(search && {
      OR: [
        { orderNumber: { contains: search } },
        { items: { some: { product: { name: { contains: search } } } } },
        { items: { some: { product: { code: { contains: search } } } } },
      ],
    }),
  };

  const [opnames, total] = await Promise.all([
    prisma.stockOpname.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { date: "desc" },
      include: {
        store: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: PRODUCT_SELECT },
          },
        },
      },
    }),
    prisma.stockOpname.count({ where }),
  ]);

  return {
    data: opnames.map(applyTransform),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getById = async (id) => {
  const opname = await prisma.stockOpname.findUnique({
    where: { id },
    include: {
      store: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: PRODUCT_SELECT },
        },
      },
    },
  });

  if (!opname)
    throw { statusCode: 404, message: "Stock opname tidak ditemukan" };
  return applyTransform(opname);
};

const create = async ({ storeId, userId, items }) => {
  if (!storeId) throw { statusCode: 400, message: "storeId wajib diisi" };
  if (!items || !Array.isArray(items) || items.length === 0)
    throw {
      statusCode: 400,
      message: "Items opname wajib diisi minimal 1 produk",
    };

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw { statusCode: 404, message: "Cabang toko tidak ditemukan" };

  // Snapshot stokSistem dari tabel Stock saat ini
  const itemsWithStock = await Promise.all(
    items.map(async (item) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product)
        throw {
          statusCode: 404,
          message: `Produk ${item.productId} tidak ditemukan`,
        };

      const stock = await prisma.stock.findUnique({
        where: { productId_storeId: { productId: item.productId, storeId } },
      });

      const stokSistem = stock?.quantity || 0;
      const stokFisik = parseFloat(item.stokFisik);
      const selisih = stokFisik - stokSistem;

      return {
        productId: item.productId,
        stokSistem,
        stokFisik,
        selisih,
        catatan: item.catatan?.trim() || null,
      };
    }),
  );

  const orderNumber = await generateOpnameNumber();

  const opname = await prisma.stockOpname.create({
    data: {
      orderNumber,
      storeId,
      userId,
      status: "DRAFT",
      items: {
        create: itemsWithStock,
      },
    },
    include: {
      store: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: PRODUCT_SELECT },
        },
      },
    },
  });

  return applyTransform(opname);
};

// Approve opname — stok sistem di-adjust ke stok fisik
const selesai = async (id, userRole) => {
  if (userRole !== "OWNER")
    throw {
      statusCode: 403,
      message: "Hanya OWNER yang bisa menyelesaikan stock opname",
    };

  const opname = await prisma.stockOpname.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!opname)
    throw { statusCode: 404, message: "Stock opname tidak ditemukan" };
  if (opname.status === "SELESAI")
    throw { statusCode: 400, message: "Stock opname ini sudah diselesaikan" };

  const updated = await prisma.$transaction(async (tx) => {
    // Adjust stok sistem ke stok fisik untuk setiap item
    for (const item of opname.items) {
      await tx.stock.upsert({
        where: {
          productId_storeId: {
            productId: item.productId,
            storeId: opname.storeId,
          },
        },
        update: { quantity: item.stokFisik },
        create: {
          productId: item.productId,
          storeId: opname.storeId,
          quantity: item.stokFisik,
        },
      });
    }

    return tx.stockOpname.update({
      where: { id },
      data: { status: "SELESAI" },
      include: {
        store: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: PRODUCT_SELECT },
          },
        },
      },
    });
  });

  return applyTransform(updated);
};

// const remove = async (id, userRole) => {
//   if (userRole !== "OWNER")
//     throw {
//       statusCode: 403,
//       message: "Hanya OWNER yang bisa menghapus stock opname",
//     };

//   const opname = await prisma.stockOpname.findUnique({ where: { id } });
//   if (!opname)
//     throw { statusCode: 404, message: "Stock opname tidak ditemukan" };
//   if (opname.status === "SELESAI")
//     throw {
//       statusCode: 400,
//       message: "Stock opname yang sudah selesai tidak bisa dihapus",
//     };

//   return prisma.stockOpname.delete({ where: { id } });
// };

const update = async (id, { items }) => {
  const opname = await prisma.stockOpname.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!opname) throw { statusCode: 404, message: 'Stock opname tidak ditemukan' };
  if (opname.status === 'SELESAI')
    throw { statusCode: 400, message: 'Stock opname yang sudah selesai tidak bisa diedit' };

  if (!items || !Array.isArray(items) || items.length === 0)
    throw { statusCode: 400, message: 'Items wajib diisi' };

  const existingProductIds = opname.items.map(i => i.productId);
  const incomingProductIds = items.map(i => i.productId);

  // Tidak boleh hapus produk yang sudah ada
  const removedIds = existingProductIds.filter(pid => !incomingProductIds.includes(pid));
  if (removedIds.length > 0)
    throw { statusCode: 400, message: 'Tidak bisa menghapus produk dari opname yang sudah dibuat' };

  // Pisahkan item lama (update) dan item baru (tambah)
  const itemsToUpdate = items.filter(i => existingProductIds.includes(i.productId));
  const itemsToAdd = items.filter(i => !existingProductIds.includes(i.productId));

  // Update item yang sudah ada — stokSistem tidak berubah
  await Promise.all(
    itemsToUpdate.map(async (item) => {
      const existingItem = opname.items.find(i => i.productId === item.productId);
      const stokFisik = parseFloat(item.stokFisik);
      const selisih = stokFisik - existingItem.stokSistem;

      return prisma.stockOpnameItem.update({
        where: { id: existingItem.id },
        data: {
          stokFisik,
          selisih,
          catatan: item.catatan?.trim() || null,
        },
      });
    })
  );

  // Tambah item baru — snapshot stokSistem saat ini
  if (itemsToAdd.length > 0) {
    const newItemsWithStock = await Promise.all(
      itemsToAdd.map(async (item) => {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) throw { statusCode: 404, message: `Produk ${item.productId} tidak ditemukan` };

        const stock = await prisma.stock.findUnique({
          where: { productId_storeId: { productId: item.productId, storeId: opname.storeId } },
        });

        const stokSistem = stock?.quantity || 0;
        const stokFisik = parseFloat(item.stokFisik);
        const selisih = stokFisik - stokSistem;

        return {
          opnameId: id,
          productId: item.productId,
          stokSistem,
          stokFisik,
          selisih,
          catatan: item.catatan?.trim() || null,
        };
      })
    );

    await prisma.stockOpnameItem.createMany({ data: newItemsWithStock });
  }

  const updated = await prisma.stockOpname.findUnique({
    where: { id },
    include: {
      store: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
      items: {
        include: {
          product: { select: PRODUCT_SELECT },
        },
      },
    },
  });

  return applyTransform(updated);
};

module.exports = { getAll, getById, create, selesai, update };
