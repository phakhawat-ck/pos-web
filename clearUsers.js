import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // ลบข้อมูลจาก child table ก่อน
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem?.deleteMany?.(); // ถ้ามี table cartItem
  await prisma.address.deleteMany();
  await prisma.shirt.deleteMany();
  await prisma.user.deleteMany();

  // รีเซ็ต sequence ของแต่ละ table
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "User_id_seq" RESTART WITH 1;`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Address_address_id_seq" RESTART WITH 1;`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Shirt_id_seq" RESTART WITH 1;`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Order_id_seq" RESTART WITH 1;`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "OrderItem_id_seq" RESTART WITH 1;`);

  console.log("ล้างข้อมูลและรีเซ็ต ID ทุก table เรียบร้อยแล้ว");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
