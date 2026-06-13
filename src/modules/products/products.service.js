const prisma = require('../../lib/prisma');

const VALID_TYPES = ['GLOSS', 'PRO', 'SUPER', 'ACCESSORIES'];

const validate = ({ code, name, type, basePrice, sellPrice, unit }) => {
  const errors = [];

  if (!code || code.toString().trim().length === 0)
    errors.push('Kode barang wajib diisi');

  if (!name || name.trim().length < 2)
    errors.push('Nama barang minimal 2 karakter');

  if (!type || !VALID_TYPES.includes(type))
    errors.push(`Tipe barang harus salah satu dari: ${VALID_TYPES.join(', ')}`);

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

const getAll = async ({ type, search, page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;

  const where = {
    ...(type && { type }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { code: { contains: search } },
      ]
    })
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { code: 'asc' },
      include: {
        stocks: {
          select: {
            quantity: true,
            store: { select: { id: true, name: true } }
          }
        }
      }
    }),
    prisma.product.count({ where })
  ]);

  const data = products.map(product => {
    const totalStock = product.stocks.reduce((sum, s) => sum + s.quantity, 0);
    return {
      ...product,
      totalStock,
      stockPerStore: product.stocks,
      stocks: undefined
    };
  });

  return {
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

const getById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      stocks: {
        include: {
          store: { select: { id: true, name: true } }
        }
      }
    }
  });

  if (!product) throw { statusCode: 404, message: 'Produk tidak ditemukan' };
  return product;
};

const create = async (body) => {
  const { code, name, type, basePrice, sellPrice, unit } = body;

  const errors = validate({ code, name, type, basePrice, sellPrice, unit });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(', ') };

  const existing = await prisma.product.findUnique({ where: { code: code.toString() } });
  if (existing) throw { statusCode: 409, message: `Kode barang ${code} sudah digunakan` };

  return prisma.product.create({
    data: {
      code: code.toString().trim(),
      name: name.trim(),
      type,
      basePrice: parseInt(basePrice),
      sellPrice: parseInt(sellPrice),
      unit: unit?.trim() || 'Kg'
    }
  });
};

const update = async (id, body) => {
  const { code, name, type, basePrice, sellPrice, unit } = body;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw { statusCode: 404, message: 'Produk tidak ditemukan' };

  const errors = validate({
    code: code ?? product.code,
    name: name ?? product.name,
    type: type ?? product.type,
    basePrice: basePrice ?? product.basePrice,
    sellPrice: sellPrice ?? product.sellPrice,
    unit: unit ?? product.unit,
  });
  if (errors.length > 0) throw { statusCode: 400, message: errors.join(', ') };

  // Cek duplikat kode kalau kode diubah
  if (code && code.toString() !== product.code) {
    const existing = await prisma.product.findUnique({ where: { code: code.toString() } });
    if (existing) throw { statusCode: 409, message: `Kode barang ${code} sudah digunakan` };
  }

  return prisma.product.update({
    where: { id },
    data: {
      ...(code && { code: code.toString().trim() }),
      ...(name && { name: name.trim() }),
      ...(type && { type }),
      ...(basePrice && { basePrice: parseInt(basePrice) }),
      ...(sellPrice && { sellPrice: parseInt(sellPrice) }),
      ...(unit && { unit: unit.trim() }),
    }
  });
};

const remove = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      _count: { select: { saleItems: true, purchaseItems: true } }
    }
  });

  if (!product) throw { statusCode: 404, message: 'Produk tidak ditemukan' };

  if (product._count.saleItems > 0 || product._count.purchaseItems > 0) {
    throw { statusCode: 400, message: 'Tidak bisa hapus produk yang sudah memiliki transaksi' };
  }

  return prisma.product.delete({ where: { id } });
};

module.exports = { getAll, getById, create, update, remove };