import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const randomStock = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

async function main() {
  console.log('🌱 Seeding...');

  // ... stores, users, products (sama seperti sebelumnya) ...

  // ==================== MUTATIONS ====================
  console.log('🌱 Seeding mutations...');

  const allProducts = await prisma.product.findMany();
  const getProduct = (code) => allProducts.find((p) => p.code === code);

  // Mutasi dari Singkil ke Balamoa
  await prisma.mutation.create({
    data: {
      fromStoreId: singkil.id,
      toStoreId: balamoa.id,
      userId: owner.id,
      note: 'Transfer stok rutin Singkil → Balamoa',
      date: new Date('2026-06-10'),
      items: {
        create: [
          { productId: getProduct('515').id, quantity: 10 },
          { productId: getProduct('210').id, quantity: 8 },
        ],
      },
    },
  });

  await prisma.stock.update({
    where: { productId_storeId: { productId: getProduct('515').id, storeId: singkil.id } },
    data: { quantity: { decrement: 10 } },
  });
  await prisma.stock.update({
    where: { productId_storeId: { productId: getProduct('210').id, storeId: singkil.id } },
    data: { quantity: { decrement: 8 } },
  });
  await prisma.stock.upsert({
    where: { productId_storeId: { productId: getProduct('515').id, storeId: balamoa.id } },
    update: { quantity: { increment: 10 } },
    create: { productId: getProduct('515').id, storeId: balamoa.id, quantity: 10 },
  });
  await prisma.stock.upsert({
    where: { productId_storeId: { productId: getProduct('210').id, storeId: balamoa.id } },
    update: { quantity: { increment: 8 } },
    create: { productId: getProduct('210').id, storeId: balamoa.id, quantity: 8 },
  });

  // Mutasi dari Balamoa ke Suradadi
  await prisma.mutation.create({
    data: {
      fromStoreId: balamoa.id,
      toStoreId: suradadi.id,
      userId: owner.id,
      note: 'Transfer stok Balamoa → Suradadi',
      date: new Date('2026-06-15'),
      items: {
        create: [
          { productId: getProduct('321').id, quantity: 5 },
          { productId: getProduct('309').id, quantity: 12 },
          { productId: getProduct('601').id, quantity: 7 },
        ],
      },
    },
  });

  await prisma.stock.update({
    where: { productId_storeId: { productId: getProduct('321').id, storeId: balamoa.id } },
    data: { quantity: { decrement: 5 } },
  });
  await prisma.stock.update({
    where: { productId_storeId: { productId: getProduct('309').id, storeId: balamoa.id } },
    data: { quantity: { decrement: 12 } },
  });
  await prisma.stock.update({
    where: { productId_storeId: { productId: getProduct('601').id, storeId: balamoa.id } },
    data: { quantity: { decrement: 7 } },
  });
  await prisma.stock.upsert({
    where: { productId_storeId: { productId: getProduct('321').id, storeId: suradadi.id } },
    update: { quantity: { increment: 5 } },
    create: { productId: getProduct('321').id, storeId: suradadi.id, quantity: 5 },
  });
  await prisma.stock.upsert({
    where: { productId_storeId: { productId: getProduct('309').id, storeId: suradadi.id } },
    update: { quantity: { increment: 12 } },
    create: { productId: getProduct('309').id, storeId: suradadi.id, quantity: 12 },
  });
  await prisma.stock.upsert({
    where: { productId_storeId: { productId: getProduct('601').id, storeId: suradadi.id } },
    update: { quantity: { increment: 7 } },
    create: { productId: getProduct('601').id, storeId: suradadi.id, quantity: 7 },
  });

  // Mutasi dari Suradadi ke Singkil
  await prisma.mutation.create({
    data: {
      fromStoreId: suradadi.id,
      toStoreId: singkil.id,
      userId: owner.id,
      note: 'Transfer stok Suradadi → Singkil',
      date: new Date('2026-06-20'),
      items: {
        create: [
          { productId: getProduct('512').id, quantity: 6 },
          { productId: getProduct('329').id, quantity: 9 },
        ],
      },
    },
  });

  await prisma.stock.update({
    where: { productId_storeId: { productId: getProduct('512').id, storeId: suradadi.id } },
    data: { quantity: { decrement: 6 } },
  });
  await prisma.stock.update({
    where: { productId_storeId: { productId: getProduct('329').id, storeId: suradadi.id } },
    data: { quantity: { decrement: 9 } },
  });
  await prisma.stock.upsert({
    where: { productId_storeId: { productId: getProduct('512').id, storeId: singkil.id } },
    update: { quantity: { increment: 6 } },
    create: { productId: getProduct('512').id, storeId: singkil.id, quantity: 6 },
  });
  await prisma.stock.upsert({
    where: { productId_storeId: { productId: getProduct('329').id, storeId: singkil.id } },
    update: { quantity: { increment: 9 } },
    create: { productId: getProduct('329').id, storeId: singkil.id, quantity: 9 },
  });

  console.log('✅ Mutations seeded');
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