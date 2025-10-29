/*
  Warnings:

  - You are about to drop the column `shirt_color` on the `Shirt` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "trackingNumber" TEXT;

-- AlterTable
ALTER TABLE "Shirt" DROP COLUMN "shirt_color";
