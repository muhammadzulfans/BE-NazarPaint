const prisma = require("../src/lib/prisma");
const { generateStoreCode } = require("../src/utils/generateCode.util");

async function main() {
  const stores = await prisma.store.findMany({
    where: {
      OR: [{ code: null }, { code: "" }],
    },
  });

  console.log(`Ditemukan ${stores.length} toko tanpa kode cabang.`);

  for (const store of stores) {
    const code = await generateStoreCode(store.name);
    await prisma.store.update({
      where: { id: store.id },
      data: { code },
    });
    console.log(`OK: ${store.name} -> kode: ${code}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
