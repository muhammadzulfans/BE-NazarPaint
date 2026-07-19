const prisma = require("../../lib/prisma");

const VALID_TYPES = ["GLOSS", "PRO", "SUPER", "ACCESSORIES"];

const DEFAULT_COLORS = {
  GLOSS: "#FFD700",
  PRO: "#1E90FF",
  SUPER: "#FF4500",
  ACCESSORIES: "#808080",
};
// code dihapus dari parameter validate karena sekarang auto-generate
const validate = ({ code, name, type, hexColor, basePrice, sellPrice, unit }) => {
  const errors = [];

  if (!code || code.toString().trim().length === 0)
    errors.push('Kode barang wajib diisi');

  if (!name || name.trim().length < 2)
    errors.push('Nama barang minimal 2 karakter');

  if (!type || !VALID_TYPES.includes(type))
    errors.push(`Tipe barang harus salah satu dari: ${VALID_TYPES.join(', ')}`);

  if (hexColor && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hexColor.trim()))
    errors.push('Format warna harus hex code, contoh: #FFFFFF');

  if (!basePrice || isNaN(basePrice) || basePrice <= 0)
    errors.push('Harga pokok harus berupa angka positif');

  if (!sellPrice || isNaN(sellPrice) || sellPrice <= 0)
    errors.push('Harga jual harus berupa angka positif');

  if (sellPrice <= basePrice)
    errors.push('Harga jual harus lebih besar dari harga pokok');

  if (unit && unit.trim().length === 0)
    errors.push('Satuan tidak boleh kosong');

  return errors;
};

const getAll = async ({
  type,
  search,
  startDate,
  endDate,
  page = 1,
  limit = 10,
} = {}) => {
  const skip = (page - 1) * limit;

  const where = {
    ...(type && { type }),
    ...(search && {
      OR: [{ name: { contains: search } }, { code: { contains: search } }],
    }),
    ...(startDate &&
      endDate && {
        createdAt: {
          gte: new Date(`${startDate}T00:00:00.000Z`),
          lte: new Date(`${endDate}T23:59:59.999Z`),
        },
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
  const { code, name, type, hexColor, basePrice, sellPrice, unit, icon } = body;

  const errors = validate({ code, name, type, hexColor, basePrice, sellPrice, unit });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(', ') };

  // Cek duplikat nama + type (bukan code)
  const existing = await prisma.product.findFirst({
    where: {
      name: { equals: name.trim() },
      type: type,
    },
  });
  if (existing) {
    throw {
      statusCode: 409,
      message: `Produk "${name.trim()}" dengan tipe ${type} sudah ada (kode: ${existing.code})`,
    };
  }

  // Tidak ada auto-generate, code dari input manual
  return prisma.product.create({
    data: {
      code: code.toString().trim(),
      name: name.trim(),
      type,
      hexColor: hexColor?.trim() || null,
      icon: icon?.trim() || null,
      basePrice: parseInt(basePrice),
      sellPrice: parseInt(sellPrice),
      unit: unit?.trim() || 'Kg',
    },
  });
};

// code TIDAK boleh diubah lagi setelah create (read-only)
const update = async (id, body) => {
  const { code, name, type, hexColor, basePrice, sellPrice, unit } = body;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw { statusCode: 404, message: 'Produk tidak ditemukan' };

  const errors = validate({
    code: code ?? product.code,
    name: name ?? product.name,
    type: type ?? product.type,
    hexColor: hexColor ?? product.hexColor,
    basePrice: basePrice ?? product.basePrice,
    sellPrice: sellPrice ?? product.sellPrice,
    unit: unit ?? product.unit,
  });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(', ') };

  // Cek duplikat nama + type kalau nama/type diubah
  if ((name && name.trim() !== product.name) || (type && type !== product.type)) {
    const existing = await prisma.product.findFirst({
      where: {
        name: { equals: (name ?? product.name).trim() },
        type: type ?? product.type,
        NOT: { id },  // exclude produk yang sedang diedit
      },
    });
    if (existing) {
      throw {
        statusCode: 409,
        message: `Produk "${(name ?? product.name).trim()}" dengan tipe ${type ?? product.type} sudah ada`,
      };
    }
  }

  return prisma.product.update({
    where: { id },
    data: {
      ...(code && { code: code.toString().trim() }),
      ...(name && { name: name.trim() }),
      ...(type && { type }),
      ...(hexColor !== undefined && { hexColor: hexColor?.trim() || null }),
      ...(basePrice && { basePrice: parseInt(basePrice) }),
      ...(sellPrice && { sellPrice: parseInt(sellPrice) }),
      ...(unit && { unit: unit.trim() }),
      ...(icon && { icon: icon.trim() }),
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
