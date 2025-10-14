import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
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

app.use(cors({
  origin: ["https://your-frontend.vercel.app", "http://localhost:3000"], // ✅ ปรับให้ตรงโดเมนของคุณ
  credentials: true
}));

app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static("public"));

// ---------- Helper ----------
function createToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "2h" }
  );
}

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

// Register
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
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ error: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: "Incorrect password" });

  const token = createToken(user);
  res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });
  res.json({ user: { id: user.id, username: user.username, role: user.role } });
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
    res.json({ user: { id: user.id, username: user.username, role: user.role } });
  } catch {
    res.status(400).json({ error: "Google login failed" });
  }
});

// Check session (JWT version)
app.get("/api/check-session", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ user: null });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // query DB เพื่อดึง name ให้แน่ใจ
    prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, name: true, role: true }
    }).then(user => {
      res.json({ user });
    });

  } catch {
    res.json({ user: null });
  }
});


// Logout
app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});

// Protected route
app.get("/main.html", verifyToken, (req, res) => {
  res.sendFile(path.join(process.cwd(), "public/main.html"));
});


// ---------- Address Routes ----------
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

app.put("/api/address", verifyToken, async (req, res) => {
  const { house_number, street, city, province, zipCode, phone } = req.body;

  if (!house_number || !street || !city || !province || !zipCode || !phone) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // ตรวจสอบว่าผู้ใช้มีอยู่จริง
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // ตรวจว่าผู้ใช้มี address หรือยัง
    const existing = await prisma.address.findUnique({
      where: { user_id: req.user.id },
    });

    let address;
    if (existing) {
      // update
      address = await prisma.address.update({
        where: { user_id: req.user.id },
        data: { house_number, street, city, province, zipCode, phone },
      });
    } else {
      // create ใหม่
      address = await prisma.address.create({
        data: { user_id: req.user.id, house_number, street, city, province, zipCode, phone },
      });
    }

    res.json(address);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});










// Shirts
app.get("/api/shirts", async (req, res) => {
  const shirts = await prisma.shirt.findMany();
  res.json(shirts);
});

app.post("/api/shirts", verifyToken, async (req, res) => {
  const user = req.user;
  if (user.role !== "admin") return res.status(403).json({ error: "Forbidden: admin only" });

  const { shirt_name, shirt_size, shirt_color, shirt_price, shirt_image } = req.body;
  if (!shirt_name || !shirt_size || !shirt_price || !Array.isArray(shirt_color) || shirt_color.length === 0)
    return res.status(400).json({ error: "Missing required fields" });

  const newShirt = await prisma.shirt.create({
    data: { shirt_name, shirt_size, shirt_color, shirt_price, shirt_image: shirt_image || null },
  });
  res.json(newShirt);
});



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

    // เพิ่ม item ลง order
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        shirtId,
        size,
        price,
        quantity: 1,
      },
    });

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

app.delete("/api/cart/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    const deleted = await prisma.orderItem.deleteMany({
      where: { id },
    });
    if (deleted.count === 0) {
      return res.status(404).json({ error: "ไม่พบสินค้าในตะกร้า" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Backend error:", err);
    res.status(500).json({ error: "ไม่สามารถลบสินค้าได้" });
  }
});
































app.listen(process.env.PORT || 3000, () =>
  console.log(`✅ Server running on port ${process.env.PORT || 3000}`)
);








