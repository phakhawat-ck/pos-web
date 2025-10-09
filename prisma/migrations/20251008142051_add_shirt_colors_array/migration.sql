/*
  Warnings:

  - The `shirt_color` column on the `Shirt` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Shirt" DROP COLUMN "shirt_color",
ADD COLUMN     "shirt_color" TEXT[];
