const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding...');

  // Stores
  const tegal = await prisma.store.upsert({
    where: { id: 'store-tegal' },
    update: {},
    create: { id: 'store-tegal', name: 'NazarPaint Tegal', address: 'Jl. Contoh No. 1, Tegal' }
  });

  const brebes = await prisma.store.upsert({
    where: { id: 'store-brebes' },
    update: {},
    create: { id: 'store-brebes', name: 'NazarPaint Brebes', address: 'Jl. Contoh No. 2, Brebes' }
  });

  console.log('✅ Stores seeded');

  // Users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@nazarpaint.com' },
    update: {},
    create: {
      name: 'Admin Owner',
      email: 'owner@nazarpaint.com',
      password: hashedPassword,
      jabatan: 'MANAGEMENT',
      role: 'OWNER'
    }
  });

  const karyawan = await prisma.user.upsert({
    where: { email: 'karyawan@nazarpaint.com' },
    update: {},
    create: {
      name: 'Budi Karyawan',
      email: 'karyawan@nazarpaint.com',
      password: hashedPassword,
      jabatan: 'KASIR',
      role: 'KARYAWAN'
    }
  });

  // Assign karyawan ke cabang Tegal
  await prisma.userStore.upsert({
    where: { userId_storeId: { userId: karyawan.id, storeId: tegal.id } },
    update: {},
    create: { userId: karyawan.id, storeId: tegal.id }
  });

  console.log('✅ Users seeded');

  // Products
  const products = [
    { code: '515', name: 'Silver', type: 'GLOSS', basePrice: 30000, sellPrice: 35000 },
    { code: '321', name: 'White', type: 'GLOSS', basePrice: 30000, sellPrice: 35000 },
    { code: '512', name: 'Black', type: 'GLOSS', basePrice: 30000, sellPrice: 35000 },
    { code: '210', name: 'Red', type: 'PRO', basePrice: 17000, sellPrice: 20000 },
    { code: '211', name: 'Black', type: 'PRO', basePrice: 17000, sellPrice: 20000 },
    { code: '207', name: 'Green', type: 'PRO', basePrice: 17000, sellPrice: 20000 },
    { code: '309', name: 'Orange', type: 'SUPER', basePrice: 20000, sellPrice: 25000 },
    { code: '601', name: 'Kuas 5', type: 'ACCESSORIES', basePrice: 10000, sellPrice: 15000 },
    { code: '602', name: 'Kuas 4', type: 'ACCESSORIES', basePrice: 9000, sellPrice: 14000 },
    { code: '603', name: 'Roll Besar', type: 'ACCESSORIES', basePrice: 15000, sellPrice: 20000 },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { code: p.code },
      update: {},
      create: { ...p, unit: 'Kg' }
    });

    // Seed stok awal di Tegal
    await prisma.stock.upsert({
      where: { productId_storeId: { productId: product.id, storeId: tegal.id } },
      update: {},
      create: { productId: product.id, storeId: tegal.id, quantity: 50 }
    });
  }

  console.log('✅ Products & Stocks seeded');
  console.log('🎉 Seeding complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());