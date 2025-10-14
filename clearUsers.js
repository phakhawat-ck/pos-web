import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // ลบ OrderItem ก่อน
  await prisma.orderItem.deleteMany();

  // ลบ Order
  await prisma.order.deleteMany();

  // ลบ User
  await prisma.user.deleteMany();

  // รีเซ็ต sequence ให้ ID เริ่มที่ 1

await prisma.$executeRawUnsafe(`
  TRUNCATE "User" RESTART IDENTITY CASCADE;
`);

  console.log("ล้างข้อมูล User, Order, OrderItem เรียบร้อยแล้ว");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
