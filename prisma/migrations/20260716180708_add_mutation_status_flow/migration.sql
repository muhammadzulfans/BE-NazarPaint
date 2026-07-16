-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_mutations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT,
    "fromStoreId" TEXT NOT NULL,
    "toStoreId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME,
    "receivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "receivedBy" TEXT,
    CONSTRAINT "mutations_fromStoreId_fkey" FOREIGN KEY ("fromStoreId") REFERENCES "stores" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "mutations_toStoreId_fkey" FOREIGN KEY ("toStoreId") REFERENCES "stores" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "mutations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "mutations_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_mutations" ("createdAt", "date", "fromStoreId", "id", "note", "orderNumber", "receivedBy", "toStoreId", "updatedAt", "userId") SELECT "createdAt", "date", "fromStoreId", "id", "note", "orderNumber", "receivedBy", "toStoreId", "updatedAt", "userId" FROM "mutations";
DROP TABLE "mutations";
ALTER TABLE "new_mutations" RENAME TO "mutations";
CREATE UNIQUE INDEX "mutations_orderNumber_key" ON "mutations"("orderNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
