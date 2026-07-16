const prisma = require("../../lib/prisma");
const { generateOrderNumber } = require("../../utils/generateCode.util");

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

const applyTransform = (mutation) => ({
  ...mutation,
  itemCount: mutation.items.length,
  items: mutation.items.map((item) => ({
    ...item,
    product: {
      ...item.product,
      hexColor:
        item.product.hexColor || DEFAULT_COLORS[item.product.type] || "#CCCCCC",
    },
  })),
});

const validate = ({ fromStoreId, toStoreId, items, date }) => {
  const errors = [];
  if (!fromStoreId) errors.push("fromStoreId wajib diisi");
  if (!toStoreId) errors.push("toStoreId wajib diisi");
  if (fromStoreId && toStoreId && fromStoreId === toStoreId)
    errors.push("Cabang asal dan tujuan tidak boleh sama");
  if (!items || !Array.isArray(items) || items.length === 0)
    errors.push("Items mutasi wajib diisi minimal 1 produk");
  items?.forEach((item, i) => {
    if (!item.productId) errors.push(`Item ke-${i + 1}: productId wajib diisi`);
    if (!item.quantity || isNaN(item.quantity) || item.quantity <= 0)
      errors.push(`Item ke-${i + 1}: quantity harus angka positif`);
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
    ...(storeId && { OR: [{ fromStoreId: storeId }, { toStoreId: storeId }] }),
    ...(status && { status }),
    ...(startDate &&
      endDate && {
        date: {
          gte: new Date(`${startDate}T00:00:00.000Z`),
          lte: new Date(`${endDate}T23:59:59.999Z`),
        },
      }),
    ...(type && {
      items: {
        some: {
          product: {
            type,
          },
        },
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

  const [mutations, total] = await Promise.all([
    prisma.mutation.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { date: "desc" },
      include: {
        fromStore: { select: { id: true, name: true } },
        toStore: { select: { id: true, name: true } },
        userFrom: { select: { id: true, name: true } },
        userTo: { select: { id: true, name: true } },
        items: {
          include: { product: { select: PRODUCT_SELECT } },
        },
      },
    }),
    prisma.mutation.count({ where }),
  ]);

  const totalQuantity = mutations.reduce(
    (sum, m) => sum + m.items.reduce((s, item) => s + item.quantity, 0),
    0,
  );

  return {
    data: mutations.map(applyTransform),
    totalQuantity,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getById = async (id) => {
  const mutation = await prisma.mutation.findUnique({
    where: { id },
    include: {
      fromStore: { select: { id: true, name: true } },
      toStore: { select: { id: true, name: true } },
      userFrom: { select: { id: true, name: true } },
      userTo: { select: { id: true, name: true } },
      items: { include: { product: { select: PRODUCT_SELECT } } },
    },
  });

  if (!mutation)
    throw { statusCode: 404, message: "Data mutasi tidak ditemukan" };
  return applyTransform(mutation);
};

// CREATE — status PENDING, stok BELUM berubah
const create = async ({
  fromStoreId,
  toStoreId,
  userId,
  items,
  note,
  date,
}) => {
  const errors = validate({ fromStoreId, toStoreId, items, date });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(", ") };

  const fromStore = await prisma.store.findUnique({
    where: { id: fromStoreId },
  });
  if (!fromStore)
    throw { statusCode: 404, message: "Cabang asal tidak ditemukan" };

  const toStore = await prisma.store.findUnique({ where: { id: toStoreId } });
  if (!toStore)
    throw { statusCode: 404, message: "Cabang tujuan tidak ditemukan" };

  // Cek stok mencukupi (preview saja, belum dikurangi)
  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });
    if (!product)
      throw {
        statusCode: 404,
        message: `Produk ${item.productId} tidak ditemukan`,
      };

    const stock = await prisma.stock.findUnique({
      where: {
        productId_storeId: { productId: item.productId, storeId: fromStoreId },
      },
    });

    if (!stock || stock.quantity < item.quantity) {
      throw {
        statusCode: 400,
        message: `Stok ${product.name} di ${fromStore.name} tidak mencukupi. Tersedia: ${stock?.quantity || 0} ${product.unit}`,
      };
    }
  }

  const orderNumber = await generateOrderNumber(fromStoreId, "mutation");

  const mutation = await prisma.mutation.create({
    data: {
      orderNumber,
      fromStoreId,
      toStoreId,
      userId,
      status: "PENDING", // stok BELUM berubah
      note: note || null,
      date: date ? new Date(date) : new Date(),
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: parseFloat(item.quantity),
        })),
      },
    },
    include: {
      fromStore: { select: { id: true, name: true } },
      toStore: { select: { id: true, name: true } },
      userFrom: { select: { id: true, name: true } },
      items: { include: { product: { select: PRODUCT_SELECT } } },
    },
  });

  return applyTransform(mutation);
};

// SEND — status PENDING → ON_GOING, stok fromStore BERKURANG
const send = async (id, userId, userRole, userStoreId) => {
  const mutation = await prisma.mutation.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!mutation) throw { statusCode: 404, message: 'Data mutasi tidak ditemukan' };
  if (mutation.status !== 'PENDING')
    throw { statusCode: 400, message: 'Hanya mutasi berstatus PENDING yang bisa dikirim' };

  // Validasi cabang — KARYAWAN hanya bisa send dari cabangnya sendiri (cabang asal)
  if (userRole === 'KARYAWAN' && userStoreId !== mutation.fromStoreId) {
    throw { statusCode: 403, message: 'Karyawan hanya bisa mengirim mutasi dari cabangnya sendiri' };
  }

  // Cek stok mencukupi saat send
  for (const item of mutation.items) {
    const stock = await prisma.stock.findUnique({
      where: { productId_storeId: { productId: item.productId, storeId: mutation.fromStoreId } },
    });
    if (!stock || stock.quantity < item.quantity) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      throw {
        statusCode: 400,
        message: `Stok ${product.name} di cabang asal tidak mencukupi. Tersedia: ${stock?.quantity || 0}`,
      };
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    for (const item of mutation.items) {
      await tx.stock.update({
        where: { productId_storeId: { productId: item.productId, storeId: mutation.fromStoreId } },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    return tx.mutation.update({
      where: { id },
      data: { status: 'ON_GOING', sentAt: new Date() },
      include: {
        fromStore: { select: { id: true, name: true } },
        toStore:   { select: { id: true, name: true } },
        userFrom:  { select: { id: true, name: true } },
        items: { include: { product: { select: PRODUCT_SELECT } } },
      },
    });
  });

  return applyTransform(updated);
};

// RECEIVE — status ON_GOING → RECEIVED, stok toStore BERTAMBAH
const receive = async (id, userId, userRole, userStoreId) => {
  const mutation = await prisma.mutation.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!mutation) throw { statusCode: 404, message: 'Data mutasi tidak ditemukan' };
  if (mutation.status !== 'ON_GOING')
    throw { statusCode: 400, message: 'Hanya mutasi berstatus ON_GOING yang bisa diterima' };

  // Validasi cabang — KARYAWAN hanya bisa receive di cabangnya sendiri (cabang tujuan)
  if (userRole === 'KARYAWAN' && userStoreId !== mutation.toStoreId) {
    throw { statusCode: 403, message: 'Karyawan hanya bisa menerima mutasi di cabangnya sendiri' };
  }

  const updated = await prisma.$transaction(async (tx) => {
    for (const item of mutation.items) {
      await tx.stock.upsert({
        where: { productId_storeId: { productId: item.productId, storeId: mutation.toStoreId } },
        update: { quantity: { increment: item.quantity } },
        create: { productId: item.productId, storeId: mutation.toStoreId, quantity: item.quantity },
      });
    }

    return tx.mutation.update({
      where: { id },
      data: { status: 'RECEIVED', receivedBy: userId, receivedAt: new Date() },
      include: {
        fromStore: { select: { id: true, name: true } },
        toStore:   { select: { id: true, name: true } },
        userFrom:  { select: { id: true, name: true } },
        userTo:    { select: { id: true, name: true } },
        items: { include: { product: { select: PRODUCT_SELECT } } },
      },
    });
  });

  return applyTransform(updated);
};

// UPDATE — hanya boleh saat PENDING
const update = async (
  id,
  { fromStoreId, toStoreId, items, note, date },
  userRole,
  userStoreId
) => {
  const mutation = await prisma.mutation.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!mutation)
    throw { statusCode: 404, message: "Data mutasi tidak ditemukan" };
  if (mutation.status !== "PENDING")
    throw {
      statusCode: 400,
      message: "Hanya mutasi berstatus PENDING yang bisa diedit",
    };

  const finalFromStoreId = fromStoreId || mutation.fromStoreId;
  const finalToStoreId = toStoreId || mutation.toStoreId;
  const finalItems = items || mutation.items;
  const finalDate = date ? new Date(date) : mutation.date;

  const errors = validate({
    fromStoreId: finalFromStoreId,
    toStoreId: finalToStoreId,
    items: finalItems,
    date,
  });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(", ") };

  // Cek stok mencukupi
  for (const item of finalItems) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });
    if (!product)
      throw {
        statusCode: 404,
        message: `Produk ${item.productId} tidak ditemukan`,
      };

    const stock = await prisma.stock.findUnique({
      where: {
        productId_storeId: {
          productId: item.productId,
          storeId: finalFromStoreId,
        },
      },
    });

    if (!stock || stock.quantity < parseFloat(item.quantity)) {
      throw {
        statusCode: 400,
        message: `Stok ${product.name} tidak mencukupi. Tersedia: ${stock?.quantity || 0} ${product.unit}`,
      };
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.mutationItem.deleteMany({ where: { mutationId: id } });

    return tx.mutation.update({
      where: { id },
      data: {
        fromStoreId: finalFromStoreId,
        toStoreId: finalToStoreId,
        note: note !== undefined ? note : mutation.note,
        date: finalDate,
        items: {
          create: finalItems.map((item) => ({
            productId: item.productId,
            quantity: parseFloat(item.quantity),
          })),
        },
      },
      include: {
        fromStore: { select: { id: true, name: true } },
        toStore: { select: { id: true, name: true } },
        userFrom: { select: { id: true, name: true } },
        items: { include: { product: { select: PRODUCT_SELECT } } },
      },
    });
  });

  return applyTransform(updated);
};

// REMOVE — hanya boleh saat PENDING (stok belum berubah, tidak perlu rollback)
const remove = async (id, userRole) => {
  if (userRole === "KARYAWAN")
    throw {
      statusCode: 403,
      message: "Karyawan tidak bisa menghapus data mutasi",
    };

  const mutation = await prisma.mutation.findUnique({ where: { id } });
  if (!mutation)
    throw { statusCode: 404, message: "Data mutasi tidak ditemukan" };
  if (mutation.status !== "PENDING")
    throw {
      statusCode: 400,
      message: "Hanya mutasi berstatus PENDING yang bisa dihapus",
    };

  return prisma.mutation.delete({ where: { id } });
};

module.exports = { getAll, getById, create, send, receive, update, remove };
