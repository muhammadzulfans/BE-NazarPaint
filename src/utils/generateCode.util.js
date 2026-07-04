const prisma = require("../lib/prisma");

const PREFIX_MAP = {
  PRO: "PRO",
  SUPER: "SPR",
  GLOSS: "GLS",
  ACCESSORIES: "ACC",
};

// Generate kode produk otomatis berdasarkan type: PRO101, SPR101, GLS101, ACC101
const generateProductCode = async (type) => {
  const prefix = PREFIX_MAP[type];
  if (!prefix) {
    throw { statusCode: 400, message: `Tipe produk tidak valid: ${type}` };
  }

  const lastProduct = await prisma.product.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
  });

  let nextNumber = 101;
  if (lastProduct) {
    const lastNumber = parseInt(lastProduct.code.replace(prefix, ""), 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${nextNumber}`;
};

// Generate order number per cabang per modul: "SIN-001", "SIN-002", dst
// model: 'sale' | 'purchase' | 'mutation'
const generateOrderNumber = async (storeId, model) => {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw { statusCode: 404, message: "Cabang toko tidak ditemukan" };
  if (!store.code)
    throw {
      statusCode: 400,
      message: `Cabang ${store.name} belum memiliki kode cabang`,
    };

  const prefix = store.code;

  const modelMap = {
    sale: prisma.sale,
    purchase: prisma.purchase,
    mutation: prisma.mutation,
  };
  const prismaModel = modelMap[model];
  if (!prismaModel)
    throw { statusCode: 400, message: `Model tidak valid: ${model}` };

  const lastRecord = await prismaModel.findFirst({
    where: { orderNumber: { startsWith: `${prefix}-` } },
    orderBy: { orderNumber: "desc" },
  });

  let nextNumber = 1;
  if (lastRecord && lastRecord.orderNumber) {
    const lastNumber = parseInt(lastRecord.orderNumber.split("-")[1], 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  const padded = String(nextNumber).padStart(3, "0");
  return `${prefix}-${padded}`;
};

// Generate kode cabang otomatis dari 3 huruf pertama kata terakhir nama toko
// "Toko Cabang Singkil" -> "SIN". Kalau duplikat, tambah angka: "SIN2", "SIN3"
const generateStoreCode = async (name) => {
  const words = name.trim().split(/\s+/);
  const lastWord = words[words.length - 1];
  const base = lastWord.substring(0, 3).toUpperCase();

  let code = base;
  let counter = 2;

  while (await prisma.store.findUnique({ where: { code } })) {
    code = `${base}${counter}`;
    counter++;
  }

  return code;
};

module.exports = {
  generateProductCode,
  generateOrderNumber,
  generateStoreCode,
};
