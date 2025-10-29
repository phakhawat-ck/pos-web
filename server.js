import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

import path from "path";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);


// Middleware
app.use(cors({
  origin: ["https://pos-app-copy.vercel.app", "http://localhost:3000"],
  credentials: true
}));

// Parse cookies and JSON bodies
app.use(cookieParser());

app.use(express.json());
app.use(express.static("public"));

// ---------- Helper ----------
function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      // ใช้ name ถ้ามี (จาก Google) ถ้าไม่มีให้ใช้ username (จาก Register)
      name: user.name || user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "2h" }
  );
}

// Middleware to verify JWT
function verifyToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ---------- Routes ----------
app.get("/", (req, res) => res.sendFile(path.join(process.cwd(), "public/login.html")));


// Register route

//POST /api/register - ลงทะเบียนผู้ใช้ใหม่
app.post("/api/register", async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  if (!/^[A-Za-z0-9]{3,30}$/.test(username))
    return res.status(400).json({ error: "Invalid username" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  if (password !== confirmPassword) return res.status(400).json({ error: "Passwords do not match!" });

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return res.status(400).json({ error: "Username already exists!" });

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { username, password: hashed, role: "user" } });
  res.json({ message: "Registration successful!" });
});


// Login

// POST /api/login - เข้าสู่ระบบ
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ error: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: "Incorrect password" });

  const token = createToken(user);
  res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
  res.json({
    token: token, // <<<--- เพิ่ม token เข้าไปใน response
    user: { id: user.id, username: user.username, name: user.name || user.username, role: user.role } //
  });
});

// Google Login
app.post("/api/google-login", async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: "Missing credential" });

  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    let user = await prisma.user.findUnique({ where: { googleId } });
    if (!user) {
      user = await prisma.user.create({ data: { name: name, email, googleId, role: "user" } });
    }

    const token = createToken(user);
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
    res.json({
      token: token, // <<<--- เพิ่ม token เข้าไปใน response
      user: { id: user.id, username: user.username, name: user.name, role: user.role } //
    });
  } catch {
    res.status(400).json({ error: "Google login failed" });
  }
});

// Check session (JWT version)

// GET /api/check-session - ตรวจสอบ session ของผู้ใช้
app.get("/api/check-session", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ user: null });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch {
    res.json({ user: null });
  }
});


// Logout
app.post("/api/logout", (req, res) => {
  // ต้องใส่ Options ให้ตรงกับตอน /api/login
  res.clearCookie("token", { httpOnly: true, secure: true, sameSite: "none" });
  res.json({ message: "Logged out successfully" });
});

// Protected route
app.get("/main.html", verifyToken, (req, res) => {
  res.sendFile(path.join(process.cwd(), "public/main.html"));
});


// ---------- Address Routes ----------

// GET /api/address - ดึงที่อยู่ของผู้ใช้
app.get("/api/address", verifyToken, async (req, res) => {
  try {
    const address = await prisma.address.findUnique({
      where: { user_id: req.user.id },
    });
    res.json(address || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// PUT /api/address - อัปเดตหรือสร้างที่อยู่ของผู้ใช้
app.put("/api/address", verifyToken, async (req, res) => {
  const { fullName, house_number, street, city, province, zipCode, phone } = req.body;
  const data = { fullName, house_number, street, city, province, zipCode, phone };

  if (!fullName || !house_number || !street || !city || !province || !zipCode || !phone) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // 1 DB Call: ถ้าเจอ user_id นี้ ให้อัปเดต (update), ถ้าไม่เจอ ให้สร้าง (create)
    const address = await prisma.address.upsert({
      where: { user_id: req.user.id },
      update: data,
      create: { user_id: req.user.id, ...data }
    });
    res.json(address);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});




// ---------- Shirt Routes ----------

// GET /api/shirts - ดึงรายการเสื้อทั้งหมด
app.get("/api/shirts", async (req, res) => {
  const shirts = await prisma.shirt.findMany({
    orderBy: { id: "asc" }
  });
  res.json(shirts);
});


// POST /api/shirts - เพิ่มเสื้อใหม่
app.post("/api/shirts", verifyToken, async (req, res) => {
  const user = req.user;
  if (user.role !== "admin") return res.status(403).json({ error: "Forbidden: admin only" });

  const { shirt_name, shirt_size, shirt_color, shirt_price, shirt_image } = req.body;
  if (!shirt_name || !shirt_size || !shirt_price)
    return res.status(400).json({ error: "Missing required fields" });

  const newShirt = await prisma.shirt.create({
    data: { shirt_name, shirt_size, shirt_color, shirt_price, shirt_image: shirt_image || null },
  });
  res.json(newShirt);
});


// GET /api/shirts/:id - ดึงเสื้อโดย ID
app.get("/api/shirts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    const shirt = await prisma.shirt.findUnique({ where: { id } });
    if (!shirt) return res.status(404).json({ error: "Shirt not found" });

    res.json(shirt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// PUT /api/shirts/:id - แก้ไขเสื้อโดย ID
app.put("/api/shirts/:id", verifyToken, async (req, res) => { // 1. เพิ่ม verifyToken
  // 2. ตรวจสอบสิทธิ์ Admin
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admin access only" });
  }

  const id = parseInt(req.params.id);
  const { shirt_name, shirt_size, shirt_price, shirt_image } = req.body;

  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    const updatedShirt = await prisma.shirt.update({
      where: { id },
      data: { shirt_name, shirt_size, shirt_price, shirt_image },
    });
    res.json(updatedShirt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete /api/shirts/:id - ลบเสื้อโดย ID
app.delete("/api/shirts/:id", verifyToken, async (req, res) => {
  const shirtId = parseInt(req.params.id);
  if (isNaN(shirtId)) {
    return res.status(400).json({ error: "Invalid shirt ID" });
  }

  try {
    // ตรวจสอบว่าเสื้อที่ต้องการลบมีอยู่ในฐานข้อมูลหรือไม่
    const shirt = await prisma.shirt.findUnique({ where: { id: shirtId } });
    if (!shirt) {
      return res.status(404).json({ error: "Shirt not found" });
    }

    // ลบเสื้อจากฐานข้อมูล
    await prisma.shirt.delete({ where: { id: shirtId } });

    // ส่งข้อความยืนยันการลบ
    res.json({ message: `Shirt with ID ${shirtId} has been deleted` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error, unable to delete shirt" });
  }
});

// ---------- Cart & Checkout Routes ----------

// POST /api/add-to-cart - เพิ่มสินค้าในตะกร้า
app.post("/api/add-to-cart", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { shirtId, size, price } = req.body;

    if (!shirtId || !size || !price) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // หา order pending ของ user
    let order = await prisma.order.findFirst({
      where: { userId, status: "pending" },
      include: { items: { include: { shirt: true } } }, // ดึง shirt ด้วย
    });

    if (!order) {
      // สร้าง order ใหม่
      order = await prisma.order.create({
        data: { userId, status: "pending" },
        include: { items: { include: { shirt: true } } },
      });
    }

    // 🔹 ตรวจว่ามี item เดิมอยู่ไหม (shirt + size เดียวกันใน order เดียวกัน)
    const existingItem = await prisma.orderItem.findFirst({
      where: {
        orderId: order.id,
        shirtId,
        size,
      },
    });

    if (existingItem) {
      // ถ้ามีอยู่แล้ว → update quantity
      await prisma.orderItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + 1,
        },
      });
    } else {
      // ถ้ายังไม่มี → create ใหม่
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          shirtId,
          size,
          price,
          quantity: 1,
        },
      });
    }

    // 🔹 ดึง order item ล่าสุดทั้งหมด
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: { include: { shirt: true } } },
    });

    // ส่งกลับ items สำหรับ frontend
    res.json({
      message: "Added to cart",
      items: updatedOrder.items.map(i => ({
        id: i.id,
        shirtName: i.shirt.shirt_name,
        size: i.size,
        price: i.price,
        quantity: i.quantity,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});



// POST /api/checkout - ยืนยันคำสั่งซื้อและเปลี่ยน status
app.post("/api/checkout", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. หา Order "pending" ปัจจุบันของ user
    const pendingOrder = await prisma.order.findFirst({
      where: { userId, status: "pending" },
      include: { items: true } // ดึง item มาด้วยเผื่อต้องเช็คว่าตะกร้าว่างไหม
    });

    // 2. ตรวจสอบว่ามี Order ให้ยืนยันไหม
    if (!pendingOrder) {
      return res.status(404).json({ error: "No pending order found to checkout." });
    }

    // (Optional) ตรวจสอบว่าตะกร้าว่างเปล่าหรือไม่
    if (pendingOrder.items.length === 0) {
      return res.status(400).json({ error: "Cannot checkout an empty cart." });
    }

    // 3. ✅ อัปเดต status จาก "pending" เป็น "waiting_shipment"
    const successOrder = await prisma.order.update({
      where: { id: pendingOrder.id },
      data: {
        status: "waiting_shipment"
      }
    });

    res.json({ message: "Checkout successful!", order: successOrder });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during checkout." });
  }
});

// GET /api/orders/history - ดึงประวัติการสั่งซื้อที่สำเร็จแล้ว
app.get("/api/orders/history", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await prisma.order.findMany({
      where: {
        userId,
        status: {
          in: ["success", "shipped", "waiting_shipment"] // ดึงเฉพาะสถานะเหล่านี้
        }
      },
      include: { items: { include: { shirt: true } } }, // ดึงของใน order มาด้วย
      orderBy: { createdAt: 'desc' } // เรียงจากใหม่ไปเก่า
    });

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------- Cart Routes ----------
// GET /api/cart - ดึงข้อมูลตะกร้าสินค้า
app.get("/api/cart", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // หา order ที่ status = "pending"
    const order = await prisma.order.findFirst({
      where: { userId, status: "pending" },
      include: {
        items: {
          include: { shirt: true } // join กับ shirt เพื่อเอาชื่อ, price
        }
      }
    });

    if (!order) return res.json({ items: [] });

    res.json({ items: order.items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// DELETE /api/cart/:id - ลบสินค้าออกจากตะกร้า
app.delete("/api/cart/:id", verifyToken, async (req, res) => { // 1. เพิ่ม verifyToken
  const id = parseInt(req.params.id);
  const userId = req.user.id; // 2. ดึง ID ผู้ใช้ที่ล็อกอิน

  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    // 3. สั่งลบ โดยเช็คว่า OrderItem (id) นี้ 
    // อยู่ใน Order (order) ที่มี userId ตรงกับคนที่ล็อกอิน
    const deleted = await prisma.orderItem.deleteMany({
      where: {
        id: id,
        order: {
          userId: userId
        }
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: "ไม่พบสินค้าในตะกร้า หรือไม่มีสิทธิ์ลบ" });
    }

    // 4. (แนะนำ) ส่งแค่ success พอ แล้วให้ Front-end เรียก API GET /api/cart ใหม่
    res.json({ success: true, message: "Item deleted" });
  } catch (err) {
    console.error("Backend error:", err);
    res.status(500).json({ error: "ไม่สามารถลบสินค้าได้" });
  }
});





// ---------- Admin Routes ----------

// GET /api/admin/orders - (สำหรับ Admin) ดึง Order ที่ไม่ใช่ pending ทั้งหมด
app.get("/api/admin/orders", verifyToken, async (req, res) => {
  // 1. ตรวจสอบว่าเป็น Admin
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admin access only" });
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        // 2. ดึงเฉพาะ Order ที่จ่ายเงินแล้ว (ไม่ใช่ "pending")
        status: {
          not: "pending"
        }
      },
      include: {
        // 3. ดึงข้อมูล user ที่สั่ง และ item+shirt ในออเดอร์
        user: {
          select: { id: true, username: true, name: true } // เลือกเฉพาะข้อมูล user ที่จำเป็น
        },
        items: {
          include: { shirt: true }
        }
      },
      orderBy: {
        createdAt: 'desc' // เรียงจากใหม่สุดไปเก่าสุด
      }
    });
    res.json(orders);
  } catch (err) {
    console.error("Admin load orders error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/admin/orders/:id/status - (สำหรับ Admin) อัปเดตสถานะ Order
app.put("/api/admin/orders/:id/status", verifyToken, async (req, res) => {

  console.log("BODY ที่ได้รับจาก Client:", req.body);
  // 1. ตรวจสอบว่าเป็น Admin
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admin access only" });
  }

  const orderId = parseInt(req.params.id);
  const { status, trackingNumber } = req.body; // รับ status ใหม่จาก front-end

  if (!status) {
    return res.status(400).json({ error: "Missing 'status' in body" });
  }

  const updateData = {
    status: status
  };

  if (trackingNumber !== undefined) {
    updateData.trackingNumber = trackingNumber;
  }

  try {
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData
    });
    res.json(updatedOrder);
  } catch (err) {
    console.error("Admin update status error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/admin/address/:userId - (สำหรับ Admin) ดึงที่อยู่ของ User ID ที่ระบุ
app.get("/api/admin/address/:userId", verifyToken, async (req, res) => {

  // 1. ตรวจสอบสิทธิ์ Admin
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admin access only" });
  }

  try {
    // 2. ดึง userId จาก URL (ที่ส่งมาจาก front-end)
    const userIdToFetch = parseInt(req.params.userId);

    if (isNaN(userIdToFetch)) {
      return res.status(400).json({ error: "Invalid User ID" });
    }

    // 3. ค้นหาที่อยู่โดยใช้ userId ที่ได้จาก URL
    const address = await prisma.address.findFirst({
      where: {
        user_id: userIdToFetch  // ⬅️ ใช้ ID จาก param
      }
    });

    if (!address) {
      // ไม่เจอที่อยู่ของ User คนนี้
      return res.status(404).json({ error: "Address not found for this user" });
    }

    // 4. ส่งที่อยู่กลับไป
    res.json(address);

  } catch (err) {
    console.error("Admin fetch address error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// Start server
app.listen(process.env.PORT || 3000, () =>
  console.log(`✅ Server running on port ${process.env.PORT || 3000}`)
);








