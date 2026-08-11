-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_stores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_stores" ("address", "code", "createdAt", "id", "name", "updatedAt") SELECT "address", "code", "createdAt", "id", "name", "updatedAt" FROM "stores";
DROP TABLE "stores";
ALTER TABLE "new_stores" RENAME TO "stores";
CREATE UNIQUE INDEX "stores_code_key" ON "stores"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
