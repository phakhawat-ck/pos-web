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
      user = await prisma.user.create({ data: { username: name, email, googleId, role: "user" } });
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
    res.json({ user: decoded });
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

app.listen(process.env.PORT || 3000, () =>
  console.log(`✅ Server running on port ${process.env.PORT || 3000}`)
);
