/*
  Warnings:

  - A unique constraint covering the columns `[orderNumber]` on the table `mutations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[orderNumber]` on the table `purchases` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[orderNumber]` on the table `sales` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `stores` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "mutations" ADD COLUMN "orderNumber" TEXT;

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN "orderNumber" TEXT;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN "orderNumber" TEXT;

-- AlterTable
ALTER TABLE "stores" ADD COLUMN "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "mutations_orderNumber_key" ON "mutations"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_orderNumber_key" ON "purchases"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orderNumber_key" ON "sales"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "stores_code_key" ON "stores"("code");
