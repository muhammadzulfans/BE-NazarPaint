const prisma = require("../../lib/prisma");
const { generateOrderNumber } = require("../../utils/generateCode.util");
const { assertStoreActive } = require("../../utils/store.util");

const VALID_STATUS = ["PENDING", "RECEIVED", "CANCELLED"];

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

const applyHexColor = (product) => ({
  ...product,
  hexColor: product.hexColor || DEFAULT_COLORS[product.type] || "#CCCCCC",
});

const applyPurchaseTransform = (purchase) => ({
  ...purchase,
  itemCount: purchase.items.length,
  items: purchase.items.map((item) => ({
    ...item,
    product: applyHexColor(item.product),
  })),
});

const validate = ({ storeId, items, date }) => {
  const errors = [];

  if (!storeId) errors.push("storeId wajib diisi");

  if (!items || !Array.isArray(items) || items.length === 0)
    errors.push("Items belanja wajib diisi minimal 1 produk");

  items?.forEach((item, i) => {
    if (!item.productId) errors.push(`Item ke-${i + 1}: productId wajib diisi`);
    if (!item.quantity || isNaN(item.quantity) || item.quantity <= 0)
      errors.push(`Item ke-${i + 1}: quantity harus angka positif`);
    if (!item.basePrice || isNaN(item.basePrice) || item.basePrice <= 0)
      errors.push(`Item ke-${i + 1}: basePrice harus angka positif`);
  });

  if (date && isNaN(new Date(date).getTime()))
    errors.push("Format tanggal tidak valid");

  return errors;
};

const getAll = async ({
  storeId,
  status,
  type,
  search,
  startDate,
  endDate,
  page = 1,
  limit = 10,
} = {}) => {
  const skip = (page - 1) * limit;

  const where = {
    ...(storeId && { storeId }),
    ...(status && { status: { in: status.split(",") } }),
    ...(startDate &&
      endDate && {
        date: {
          gte: new Date(`${startDate}T00:00:00.000+07:00`),
          lte: new Date(`${endDate}T23:59:59.999+07:00`),
        },
      }),
    ...(type || search
      ? {
          items: {
            some: {
              product: {
                ...(type && { type }),
                ...(search && {
                  OR: [
                    { name: { contains: search } },
                    { code: { contains: search } },
                  ],
                }),
              },
            },
          },
        }
      : {}),
  };

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
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
    prisma.purchase.count({ where }),
  ]);

  const totalQuantity = purchases.reduce(
    (sum, p) => sum + p.items.reduce((s, item) => s + item.quantity, 0),
    0,
  );
  const totalAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const pendingCount = purchases.filter((p) => p.status === "PENDING").length;

  return {
    data: purchases.map(applyPurchaseTransform),
    totalQuantity,
    totalAmount,
    pendingCount,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getById = async (id) => {
  const purchase = await prisma.purchase.findUnique({
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

  if (!purchase)
    throw { statusCode: 404, message: "Transaksi belanja tidak ditemukan" };

  return applyPurchaseTransform(purchase);
};

const create = async ({ storeId, userId, items, date }) => {
  const errors = validate({ storeId, items, date });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(", ") };

  // Validasi cabang aktif sebelum PO baru
  await assertStoreActive(storeId);

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw { statusCode: 404, message: "Cabang toko tidak ditemukan" };

  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });
    if (!product)
      throw {
        statusCode: 404,
        message: `Produk ${item.productId} tidak ditemukan`,
      };
  }

  const totalAmount = items.reduce(
    (sum, item) => sum + parseFloat(item.quantity) * parseInt(item.basePrice),
    0,
  );

  const orderNumber = await generateOrderNumber(storeId, "purchase");

  const purchase = await prisma.purchase.create({
    data: {
      orderNumber,
      storeId,
      userId,
      totalAmount,
      status: "PENDING",
      date: date ? new Date(date) : new Date(),
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: parseFloat(item.quantity),
          basePrice: parseInt(item.basePrice),
          totalPrice: parseFloat(item.quantity) * parseInt(item.basePrice),
        })),
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

  return applyPurchaseTransform(purchase);
};

const receive = async (id, userRole) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!purchase)
    throw { statusCode: 404, message: "Transaksi belanja tidak ditemukan" };

  if (purchase.status === "RECEIVED")
    throw {
      statusCode: 400,
      message: "PO ini sudah dikonfirmasi diterima sebelumnya",
    };

  if (purchase.status === "CANCELLED")
    throw {
      statusCode: 400,
      message: "PO yang sudah dibatalkan tidak bisa diterima",
    };

  const updated = await prisma.$transaction(async (tx) => {
    const updatedPurchase = await tx.purchase.update({
      where: { id },
      data: { status: "RECEIVED", receivedAt: new Date() },
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

    for (const item of purchase.items) {
      await tx.stock.upsert({
        where: {
          productId_storeId: {
            productId: item.productId,
            storeId: purchase.storeId,
          },
        },
        update: { quantity: { increment: item.quantity } },
        create: {
          productId: item.productId,
          storeId: purchase.storeId,
          quantity: item.quantity,
        },
      });
    }

    return updatedPurchase;
  });

  return applyPurchaseTransform(updated);
};

const cancel = async (id, userRole) => {
  const purchase = await prisma.purchase.findUnique({ where: { id } });

  if (!purchase)
    throw { statusCode: 404, message: "Transaksi belanja tidak ditemukan" };

  if (purchase.status === "RECEIVED")
    throw {
      statusCode: 400,
      message:
        "PO yang sudah diterima tidak bisa dibatalkan. Gunakan hapus transaksi jika perlu rollback stok",
    };

  if (purchase.status === "CANCELLED")
    throw { statusCode: 400, message: "PO ini sudah dibatalkan sebelumnya" };

  const updated = await prisma.purchase.update({
    where: { id },
    data: { status: "CANCELLED" },
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

  return applyPurchaseTransform(updated);
};

const update = async (id, { items, date }, userRole) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!purchase)
    throw { statusCode: 404, message: "Transaksi belanja tidak ditemukan" };

  if (purchase.status !== "PENDING")
    throw {
      statusCode: 400,
      message: "Hanya PO berstatus PENDING yang bisa diedit",
    };

  if (userRole === "KARYAWAN") {
    const today = new Date();
    const purchaseDate = new Date(purchase.date);
    const isToday = purchaseDate.toDateString() === today.toDateString();
    if (!isToday)
      throw {
        statusCode: 403,
        message: "Karyawan hanya bisa edit transaksi hari ini",
      };
  }

  if (items) {
    const errors = validate({ storeId: purchase.storeId, items, date });
    if (errors.length > 0)
      throw { statusCode: 400, message: errors.join(", ") };
  }

  const newItems = items || purchase.items;
  const totalAmount = newItems.reduce(
    (sum, item) => sum + parseFloat(item.quantity) * parseInt(item.basePrice),
    0,
  );

  const updated = await prisma.$transaction(async (tx) => {
    await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });

    return tx.purchase.update({
      where: { id },
      data: {
        totalAmount,
        date: date ? new Date(date) : purchase.date,
        items: {
          create: newItems.map((item) => ({
            productId: item.productId,
            quantity: parseFloat(item.quantity),
            basePrice: parseInt(item.basePrice),
            totalPrice: parseFloat(item.quantity) * parseInt(item.basePrice),
          })),
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
  });

  return applyPurchaseTransform(updated);
};

const remove = async (id, userRole) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!purchase)
    throw { statusCode: 404, message: "Transaksi belanja tidak ditemukan" };

  if (userRole === "KARYAWAN")
    throw {
      statusCode: 403,
      message: "Karyawan tidak bisa menghapus transaksi belanja",
    };

  await prisma.$transaction(async (tx) => {
    if (purchase.status === "RECEIVED") {
      for (const item of purchase.items) {
        await tx.stock.update({
          where: {
            productId_storeId: {
              productId: item.productId,
              storeId: purchase.storeId,
            },
          },
          data: { quantity: { decrement: item.quantity } },
        });
      }
    }
    await tx.purchase.delete({ where: { id } });
  });
};

module.exports = { getAll, getById, create, update, remove, receive, cancel };