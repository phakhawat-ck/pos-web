-- DropForeignKey
ALTER TABLE "public"."CartItem" DROP CONSTRAINT "CartItem_shirtId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OrderItem" DROP CONSTRAINT "OrderItem_shirtId_fkey";

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_shirtId_fkey" FOREIGN KEY ("shirtId") REFERENCES "Shirt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_shirtId_fkey" FOREIGN KEY ("shirtId") REFERENCES "Shirt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
