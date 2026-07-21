-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_stock_opname_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opnameId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stokSistem" REAL NOT NULL,
    "stokFisik" REAL,
    "selisih" REAL,
    "catatan" TEXT,
    CONSTRAINT "stock_opname_items_opnameId_fkey" FOREIGN KEY ("opnameId") REFERENCES "stock_opnames" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_opname_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_stock_opname_items" ("catatan", "id", "opnameId", "productId", "selisih", "stokFisik", "stokSistem") SELECT "catatan", "id", "opnameId", "productId", "selisih", "stokFisik", "stokSistem" FROM "stock_opname_items";
DROP TABLE "stock_opname_items";
ALTER TABLE "new_stock_opname_items" RENAME TO "stock_opname_items";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
