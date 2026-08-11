const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Helper untuk random stok dalam range tertentu
const randomStock = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

async function main() {
  console.log("🌱 Seeding...");

  // ==================== STORES ====================
  const singkil = await prisma.store.upsert({
    where: { id: "store-singkil" },
    update: {},
    create: {
      id: "store-singkil",
      name: "Toko Cabang Singkil",
      address: "Singkil",
    },
  });

  const balamoa = await prisma.store.upsert({
    where: { id: "store-balamoa" },
    update: {},
    create: {
      id: "store-balamoa",
      name: "Toko Cabang Balamoa",
      address: "Balamoa",
    },
  });

  const suradadi = await prisma.store.upsert({
    where: { id: "store-suradadi" },
    update: {},
    create: {
      id: "store-suradadi",
      name: "Toko Cabang Suradadi",
      address: "Suradadi",
    },
  });

  console.log("✅ Stores seeded");

  // ==================== USERS ====================
  const hashedPassword = await bcrypt.hash("password123", 10);

  const owner = await prisma.user.upsert({
    where: { email: "owner@nazarpaint.com" },
    update: {},
    create: {
      name: "Admin Owner",
      email: "owner@nazarpaint.com",
      password: hashedPassword,
      jabatan: "MANAGEMENT",
      role: "OWNER",
    },
  });

  const karyawanSingkil = await prisma.user.upsert({
    where: { email: "singkil@nazarpaint.com" },
    update: {},
    create: {
      name: "Karyawan Singkil",
      email: "singkil@nazarpaint.com",
      password: hashedPassword,
      jabatan: "KASIR",
      role: "KARYAWAN",
    },
  });

  const karyawanBalamoa = await prisma.user.upsert({
    where: { email: "balamoa@nazarpaint.com" },
    update: {},
    create: {
      name: "Karyawan Balamoa",
      email: "balamoa@nazarpaint.com",
      password: hashedPassword,
      jabatan: "KASIR",
      role: "KARYAWAN",
    },
  });

  const karyawanSuradadi = await prisma.user.upsert({
    where: { email: "suradadi@nazarpaint.com" },
    update: {},
    create: {
      name: "Karyawan Suradadi",
      email: "suradadi@nazarpaint.com",
      password: hashedPassword,
      jabatan: "KASIR",
      role: "KARYAWAN",
    },
  });

  await prisma.userStore.upsert({
    where: {
      userId_storeId: { userId: karyawanSingkil.id, storeId: singkil.id },
    },
    update: {},
    create: { userId: karyawanSingkil.id, storeId: singkil.id },
  });

  await prisma.userStore.upsert({
    where: {
      userId_storeId: { userId: karyawanBalamoa.id, storeId: balamoa.id },
    },
    update: {},
    create: { userId: karyawanBalamoa.id, storeId: balamoa.id },
  });

  await prisma.userStore.upsert({
    where: {
      userId_storeId: { userId: karyawanSuradadi.id, storeId: suradadi.id },
    },
    update: {},
    create: { userId: karyawanSuradadi.id, storeId: suradadi.id },
  });

  console.log("✅ Users seeded");

  // ==================== PRODUCTS ====================
  const products = [
    {
      code: "515",
      name: "Silver",
      type: "GLOSS",
      basePrice: 30000,
      sellPrice: 35000,
      unit: "Kg",
    },
    {
      code: "321",
      name: "White",
      type: "GLOSS",
      basePrice: 30000,
      sellPrice: 35000,
      unit: "Kg",
    },
    {
      code: "512",
      name: "Black",
      type: "GLOSS",
      basePrice: 30000,
      sellPrice: 35000,
      unit: "Kg",
    },
    {
      code: "210",
      name: "Red",
      type: "PRO",
      basePrice: 17000,
      sellPrice: 20000,
      unit: "Kg",
    },
    {
      code: "211",
      name: "Black",
      type: "PRO",
      basePrice: 17000,
      sellPrice: 20000,
      unit: "Kg",
    },
    {
      code: "207",
      name: "Green",
      type: "PRO",
      basePrice: 17000,
      sellPrice: 20000,
      unit: "Kg",
    },
    {
      code: "309",
      name: "Orange",
      type: "SUPER",
      basePrice: 20000,
      sellPrice: 25000,
      unit: "Kg",
    },
    {
      code: "329",
      name: "Yellow",
      type: "SUPER",
      basePrice: 20000,
      sellPrice: 25000,
      unit: "Kg",
    },
    {
      code: "331",
      name: "Green",
      type: "SUPER",
      basePrice: 20000,
      sellPrice: 25000,
      unit: "Kg",
    },
    {
      code: "601",
      name: "Kuas 5",
      type: "ACCESSORIES",
      basePrice: 10000,
      sellPrice: 15000,
      unit: "Pcs",
    },
    {
      code: "602",
      name: "Kuas 4",
      type: "ACCESSORIES",
      basePrice: 9000,
      sellPrice: 14000,
      unit: "Pcs",
    },
    {
      code: "603",
      name: "Roll Besar",
      type: "ACCESSORIES",
      basePrice: 15000,
      sellPrice: 20000,
      unit: "Pcs",
    },
  ];

  const stores = [singkil, balamoa, suradadi];

  for (const p of products) {
    // FIX: code tidak unik, jadi pakai findFirst + create
    let product = await prisma.product.findFirst({
      where: { code: p.code },
    });

    if (!product) {
      product = await prisma.product.create({
        data: { ...p },
      });
    }

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
        where: {
          productId_storeId: { productId: product.id, storeId: store.id },
        },
        update: {},
        create: { productId: product.id, storeId: store.id, quantity },
      });
    }
  }
  // Ambil semua produk dan stores untuk referensi
  const allProducts = await prisma.product.findMany();
  const getProduct = (code) => allProducts.find((p) => p.code === code);

  // Mutasi dari Singkil ke Balamoa
  const mutation1 = await prisma.mutation.create({
    data: {
      fromStoreId: singkil.id,
      toStoreId: balamoa.id,
      userId: owner.id,
      note: "Transfer stok rutin Singkil → Balamoa",
      date: new Date("2026-06-10"),
      items: {
        create: [
          { productId: getProduct("515").id, quantity: 10 },
          { productId: getProduct("210").id, quantity: 8 },
        ],
      },
    },
  });

  // Update stok Singkil berkurang
  await prisma.stock.update({
    where: {
      productId_storeId: {
        productId: getProduct("515").id,
        storeId: singkil.id,
      },
    },
    data: { quantity: { decrement: 10 } },
  });
  await prisma.stock.update({
    where: {
      productId_storeId: {
        productId: getProduct("210").id,
        storeId: singkil.id,
      },
    },
    data: { quantity: { decrement: 8 } },
  });

  // Update stok Balamoa bertambah
  await prisma.stock.upsert({
    where: {
      productId_storeId: {
        productId: getProduct("515").id,
        storeId: balamoa.id,
      },
    },
    update: { quantity: { increment: 10 } },
    create: {
      productId: getProduct("515").id,
      storeId: balamoa.id,
      quantity: 10,
    },
  });
  await prisma.stock.upsert({
    where: {
      productId_storeId: {
        productId: getProduct("210").id,
        storeId: balamoa.id,
      },
    },
    update: { quantity: { increment: 8 } },
    create: {
      productId: getProduct("210").id,
      storeId: balamoa.id,
      quantity: 8,
    },
  });

  // Mutasi dari Balamoa ke Suradadi
  const mutation2 = await prisma.mutation.create({
    data: {
      fromStoreId: balamoa.id,
      toStoreId: suradadi.id,
      userId: owner.id,
      note: "Transfer stok Balamoa → Suradadi",
      date: new Date("2026-06-15"),
      items: {
        create: [
          { productId: getProduct("321").id, quantity: 5 },
          { productId: getProduct("309").id, quantity: 12 },
          { productId: getProduct("601").id, quantity: 7 },
        ],
      },
    },
  });

  await prisma.stock.update({
    where: {
      productId_storeId: {
        productId: getProduct("321").id,
        storeId: balamoa.id,
      },
    },
    data: { quantity: { decrement: 5 } },
  });
  await prisma.stock.update({
    where: {
      productId_storeId: {
        productId: getProduct("309").id,
        storeId: balamoa.id,
      },
    },
    data: { quantity: { decrement: 12 } },
  });
  await prisma.stock.update({
    where: {
      productId_storeId: {
        productId: getProduct("601").id,
        storeId: balamoa.id,
      },
    },
    data: { quantity: { decrement: 7 } },
  });

  await prisma.stock.upsert({
    where: {
      productId_storeId: {
        productId: getProduct("321").id,
        storeId: suradadi.id,
      },
    },
    update: { quantity: { increment: 5 } },
    create: {
      productId: getProduct("321").id,
      storeId: suradadi.id,
      quantity: 5,
    },
  });
  await prisma.stock.upsert({
    where: {
      productId_storeId: {
        productId: getProduct("309").id,
        storeId: suradadi.id,
      },
    },
    update: { quantity: { increment: 12 } },
    create: {
      productId: getProduct("309").id,
      storeId: suradadi.id,
      quantity: 12,
    },
  });
  await prisma.stock.upsert({
    where: {
      productId_storeId: {
        productId: getProduct("601").id,
        storeId: suradadi.id,
      },
    },
    update: { quantity: { increment: 7 } },
    create: {
      productId: getProduct("601").id,
      storeId: suradadi.id,
      quantity: 7,
    },
  });

  // Mutasi dari Suradadi ke Singkil
  const mutation3 = await prisma.mutation.create({
    data: {
      fromStoreId: suradadi.id,
      toStoreId: singkil.id,
      userId: owner.id,
      note: "Transfer stok Suradadi → Singkil",
      date: new Date("2026-06-20"),
      items: {
        create: [
          { productId: getProduct("512").id, quantity: 6 },
          { productId: getProduct("329").id, quantity: 9 },
        ],
      },
    },
  });

  await prisma.stock.update({
    where: {
      productId_storeId: {
        productId: getProduct("512").id,
        storeId: suradadi.id,
      },
    },
    data: { quantity: { decrement: 6 } },
  });
  await prisma.stock.update({
    where: {
      productId_storeId: {
        productId: getProduct("329").id,
        storeId: suradadi.id,
      },
    },
    data: { quantity: { decrement: 9 } },
  });

  await prisma.stock.upsert({
    where: {
      productId_storeId: {
        productId: getProduct("512").id,
        storeId: singkil.id,
      },
    },
    update: { quantity: { increment: 6 } },
    create: {
      productId: getProduct("512").id,
      storeId: singkil.id,
      quantity: 6,
    },
  });
  await prisma.stock.upsert({
    where: {
      productId_storeId: {
        productId: getProduct("329").id,
        storeId: singkil.id,
      },
    },
    update: { quantity: { increment: 9 } },
    create: {
      productId: getProduct("329").id,
      storeId: singkil.id,
      quantity: 9,
    },
  });

  console.log("✅ Mutations seeded");
  console.log("✅ Products & Stocks seeded (variasi realistis per cabang)");
  console.log("🎉 Seeding complete!");
  console.log("");
  console.log("Login info:");
  console.log("  Owner    → owner@nazarpaint.com / password123");
  console.log("  Singkil  → singkil@nazarpaint.com / password123");
  console.log("  Balamoa  → balamoa@nazarpaint.com / password123");
  console.log("  Suradadi → suradadi@nazarpaint.com / password123");
}

// ==================== MUTATIONS ====================
console.log("🌱 Seeding mutations...");

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());