-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL DEFAULT 'MANAGEMENT',
    "role" TEXT NOT NULL DEFAULT 'KARYAWAN',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "avatar" TEXT DEFAULT 'uploads/avatars/default.jpg',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("avatar", "createdAt", "email", "id", "jabatan", "name", "password", "role", "updatedAt") SELECT "avatar", "createdAt", "email", "id", "jabatan", "name", "password", "role", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
