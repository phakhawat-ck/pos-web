/*
  Warnings:

  - You are about to drop the column `name` on the `Address` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Address" DROP COLUMN "name",
ADD COLUMN     "fullName" TEXT;
