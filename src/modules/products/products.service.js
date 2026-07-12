const prisma = require("../../lib/prisma");
const { generateProductCode } = require("../../utils/generateCode.util");

const VALID_TYPES = ["GLOSS", "PRO", "SUPER", "ACCESSORIES"];

const DEFAULT_COLORS = {
  GLOSS: "#FFD700",
  PRO: "#1E90FF",
  SUPER: "#FF4500",
  ACCESSORIES: "#808080",
};
// code dihapus dari parameter validate karena sekarang auto-generate
const validate = ({ name, type, hexColor, basePrice, sellPrice, unit }) => {
  const errors = [];

  if (!name || name.trim().length < 2)
    errors.push("Nama barang minimal 2 karakter");

  if (!type || !VALID_TYPES.includes(type))
    errors.push(`Tipe barang harus salah satu dari: ${VALID_TYPES.join(", ")}`);

  if (hexColor && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hexColor.trim()))
    errors.push("Format warna harus hex code, contoh: #FFFFFF");

  if (!basePrice || isNaN(basePrice) || basePrice <= 0)
    errors.push("Harga pokok harus berupa angka positif");

  if (!sellPrice || isNaN(sellPrice) || sellPrice <= 0)
    errors.push("Harga jual harus berupa angka positif");

  if (sellPrice <= basePrice)
    errors.push("Harga jual harus lebih besar dari harga pokok");

  if (unit && unit.trim().length === 0)
    errors.push("Satuan tidak boleh kosong");

  return errors;
};

const getAll = async ({ type, search, page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;

  const where = {
    ...(type && { type }),
    ...(search && {
      OR: [{ name: { contains: search } }, { code: { contains: search } }],
    }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { code: "asc" },
      include: {
        stocks: {
          select: {
            quantity: true,
            store: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const data = products.map((product) => {
    const totalStock = product.stocks.reduce((sum, s) => sum + s.quantity, 0);
    return {
      ...product,
      hexColor: product.hexColor || DEFAULT_COLORS[product.type] || "#CCCCCC",
      totalStock,
      stockPerStore: product.stocks,
      stocks: undefined,
    };
  });

  return {
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      stocks: {
        include: {
          store: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!product) throw { statusCode: 404, message: "Produk tidak ditemukan" };
  return {
    ...product,
    hexColor: product.hexColor || DEFAULT_COLORS[product.type] || "#CCCCCC",
  };
};

// code TIDAK lagi diambil dari body — di-generate otomatis berdasarkan type
const create = async (body) => {
  const { name, type, hexColor, basePrice, sellPrice, unit } = body;

  const errors = validate({ name, type, hexColor, basePrice, sellPrice, unit });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(", ") };

  const code = await generateProductCode(type);

  return prisma.product.create({
    data: {
      code,
      name: name.trim(),
      type,
      hexColor: hexColor?.trim() || null,
      basePrice: parseInt(basePrice),
      sellPrice: parseInt(sellPrice),
      unit: unit?.trim() || "Kg",
    },
  });
};

// code TIDAK boleh diubah lagi setelah create (read-only)
const update = async (id, body) => {
  const { name, type, hexColor, basePrice, sellPrice, unit } = body;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw { statusCode: 404, message: "Produk tidak ditemukan" };

  const errors = validate({
    name: name ?? product.name,
    type: type ?? product.type,
    hexColor: hexColor ?? product.hexColor,
    basePrice: basePrice ?? product.basePrice,
    sellPrice: sellPrice ?? product.sellPrice,
    unit: unit ?? product.unit,
  });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(", ") };

  return prisma.product.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(type && { type }),
      ...(hexColor !== undefined && { hexColor: hexColor?.trim() || null }),
      ...(basePrice && { basePrice: parseInt(basePrice) }),
      ...(sellPrice && { sellPrice: parseInt(sellPrice) }),
      ...(unit && { unit: unit.trim() }),
    },
  });
};

const remove = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      _count: { select: { saleItems: true, purchaseItems: true } },
    },
  });

  if (!product) throw { statusCode: 404, message: "Produk tidak ditemukan" };

  if (product._count.saleItems > 0 || product._count.purchaseItems > 0) {
    throw {
      statusCode: 400,
      message: "Tidak bisa hapus produk yang sudah memiliki transaksi",
    };
  }

  return prisma.product.delete({ where: { id } });
};

module.exports = { getAll, getById, create, update, remove };
