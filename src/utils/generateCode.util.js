const prisma = require('../lib/prisma');

const PREFIX_MAP = {
  PRO: 'PRO',
  SUPER: 'SPR',
  GLOSS: 'GLS',
  ACCESSORIES: 'ACC',
};

const generateProductCode = async (type) => {
  const prefix = PREFIX_MAP[type];
  if (!prefix) {
    throw { statusCode: 400, message: `Tipe produk tidak valid: ${type}` };
  }

  const lastProduct = await prisma.product.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
  });

  let nextNumber = 101;
  if (lastProduct) {
    const lastNumber = parseInt(lastProduct.code.replace(prefix, ''), 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${nextNumber}`;
};

module.exports = { generateProductCode };