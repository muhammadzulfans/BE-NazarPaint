-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "icon" TEXT,
    "hexColor" TEXT,
    "basePrice" INTEGER NOT NULL,
    "sellPrice" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'Kg',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_products" ("basePrice", "code", "createdAt", "hexColor", "icon", "id", "name", "sellPrice", "type", "unit", "updatedAt") SELECT "basePrice", "code", "createdAt", "hexColor", "icon", "id", "name", "sellPrice", "type", "unit", "updatedAt" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
