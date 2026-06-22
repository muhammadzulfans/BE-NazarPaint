const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Helper untuk random stok dalam range tertentu
const randomStock = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function main() {
  console.log('🌱 Seeding...');

  // ==================== STORES ====================
  const singkil = await prisma.store.upsert({
    where: { id: 'store-singkil' },
    update: {},
    create: { id: 'store-singkil', name: 'Toko Cabang Singkil', address: 'Singkil' }
  });

  const balamoa = await prisma.store.upsert({
    where: { id: 'store-balamoa' },
    update: {},
    create: { id: 'store-balamoa', name: 'Toko Cabang Balamoa', address: 'Balamoa' }
  });

  const suradadi = await prisma.store.upsert({
    where: { id: 'store-suradadi' },
    update: {},
    create: { id: 'store-suradadi', name: 'Toko Cabang Suradadi', address: 'Suradadi' }
  });

  console.log('✅ Stores seeded');

  // ==================== USERS ====================
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

  const karyawanSingkil = await prisma.user.upsert({
    where: { email: 'singkil@nazarpaint.com' },
    update: {},
    create: {
      name: 'Karyawan Singkil',
      email: 'singkil@nazarpaint.com',
      password: hashedPassword,
      jabatan: 'KASIR',
      role: 'KARYAWAN'
    }
  });

  const karyawanBalamoa = await prisma.user.upsert({
    where: { email: 'balamoa@nazarpaint.com' },
    update: {},
    create: {
      name: 'Karyawan Balamoa',
      email: 'balamoa@nazarpaint.com',
      password: hashedPassword,
      jabatan: 'KASIR',
      role: 'KARYAWAN'
    }
  });

  const karyawanSuradadi = await prisma.user.upsert({
    where: { email: 'suradadi@nazarpaint.com' },
    update: {},
    create: {
      name: 'Karyawan Suradadi',
      email: 'suradadi@nazarpaint.com',
      password: hashedPassword,
      jabatan: 'KASIR',
      role: 'KARYAWAN'
    }
  });

  await prisma.userStore.upsert({
    where: { userId_storeId: { userId: karyawanSingkil.id, storeId: singkil.id } },
    update: {},
    create: { userId: karyawanSingkil.id, storeId: singkil.id }
  });

  await prisma.userStore.upsert({
    where: { userId_storeId: { userId: karyawanBalamoa.id, storeId: balamoa.id } },
    update: {},
    create: { userId: karyawanBalamoa.id, storeId: balamoa.id }
  });

  await prisma.userStore.upsert({
    where: { userId_storeId: { userId: karyawanSuradadi.id, storeId: suradadi.id } },
    update: {},
    create: { userId: karyawanSuradadi.id, storeId: suradadi.id }
  });

  console.log('✅ Users seeded');

  // ==================== PRODUCTS ====================
  const products = [
    { code: '515', name: 'Silver',     type: 'GLOSS',       basePrice: 30000, sellPrice: 35000, unit: 'Kg' },
    { code: '321', name: 'White',      type: 'GLOSS',       basePrice: 30000, sellPrice: 35000, unit: 'Kg' },
    { code: '512', name: 'Black',      type: 'GLOSS',       basePrice: 30000, sellPrice: 35000, unit: 'Kg' },
    { code: '210', name: 'Red',        type: 'PRO',         basePrice: 17000, sellPrice: 20000, unit: 'Kg' },
    { code: '211', name: 'Black',      type: 'PRO',         basePrice: 17000, sellPrice: 20000, unit: 'Kg' },
    { code: '207', name: 'Green',      type: 'PRO',         basePrice: 17000, sellPrice: 20000, unit: 'Kg' },
    { code: '309', name: 'Orange',     type: 'SUPER',       basePrice: 20000, sellPrice: 25000, unit: 'Kg' },
    { code: '329', name: 'Yellow',     type: 'SUPER',       basePrice: 20000, sellPrice: 25000, unit: 'Kg' },
    { code: '331', name: 'Green',      type: 'SUPER',       basePrice: 20000, sellPrice: 25000, unit: 'Kg' },
    { code: '601', name: 'Kuas 5',     type: 'ACCESSORIES', basePrice: 10000, sellPrice: 15000, unit: 'Pcs' },
    { code: '602', name: 'Kuas 4',     type: 'ACCESSORIES', basePrice: 9000,  sellPrice: 14000, unit: 'Pcs' },
    { code: '603', name: 'Roll Besar', type: 'ACCESSORIES', basePrice: 15000, sellPrice: 20000, unit: 'Pcs' },
  ];

  const stores = [singkil, balamoa, suradadi];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { code: p.code },
      update: {},
      create: { ...p }
    });

    // Stok beda-beda tiap cabang — termasuk skenario stok hampir habis & kosong
    for (const store of stores) {
      let quantity;

      // Variasi realistis: kadang banyak, kadang hampir habis, kadang kosong
      const scenario = Math.random();
      if (scenario < 0.15) {
        quantity = 0; // 15% kemungkinan stok habis
      } else if (scenario < 0.35) {
        quantity = randomStock(1, 10); // 20% kemungkinan stok hampir habis
      } else {
        quantity = randomStock(15, 80); // 65% kemungkinan stok normal
      }

      await prisma.stock.upsert({
        where: { productId_storeId: { productId: product.id, storeId: store.id } },
        update: {},
        create: { productId: product.id, storeId: store.id, quantity }
      });
    }
  }

  console.log('✅ Products & Stocks seeded (variasi realistis per cabang)');
  console.log('🎉 Seeding complete!');
  console.log('');
  console.log('Login info:');
  console.log('  Owner    → owner@nazarpaint.com / password123');
  console.log('  Singkil  → singkil@nazarpaint.com / password123');
  console.log('  Balamoa  → balamoa@nazarpaint.com / password123');
  console.log('  Suradadi → suradadi@nazarpaint.com / password123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());