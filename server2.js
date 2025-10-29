// ===========================================
// server.js 
// ===========================================

import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import path from "path";
import cors from "cors";
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";

// ✅ Import pool จาก db.js ที่เราสร้าง
import pool from "./db.js"; //

dotenv.config();

const app = express();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Middleware (เหมือนเดิม)
app.use(cors({
    origin: ["https://pos-app-copy.vercel.app/", "http://localhost:3000"], //
    credentials: true
}));
app.use(cookieParser()); //
app.use(express.json()); // Parse JSON bodies
app.use(express.static("public")); // Serve static files

// ---------- Helper (เหมือนเดิม) ----------
/**
 * สร้าง JWT Token สำหรับ User
 * @param {object} user - ข้อมูล User จากฐานข้อมูล (ต้องมี id, role, name หรือ username)
 * @returns {string} - JWT Token
 */
function createToken(user) {
    // ✅ ใช้ชื่อคอลัมน์จาก DB โดยตรง
    // ในที่นี้ ชื่อคอลัมน์เหมือนกัน เลยไม่ต้องแก้
    return jwt.sign(
        {
            id: user.id,
            name: user.name || user.username, // DB มีคอลัมน์ name และ username
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: "2h" } // Token หมดอายุใน 2 ชั่วโมง
    );
}

// ---------- Middleware to verify JWT ----------
/**
 * Middleware สำหรับตรวจสอบ JWT Token
 * หา Token จาก Authorization Header (Bearer) ก่อน ถ้าไม่มีค่อยหาใน Cookie
 * ถ้า Token ถูกต้อง จะแนบข้อมูล user (decoded payload) ไปกับ req.user
 */
// Middleware to verify JWT (พร้อม logging เพิ่มเติม)
function verifyToken(req, res, next) {
    let token = null;
    let source = 'None';

    console.log(`[verifyToken] กำลังตรวจสอบ token สำหรับ request: ${req.method} ${req.path}`);

    // 1. ตรวจสอบ Authorization Header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
        source = 'Header';
        console.log('[verifyToken] พบ token ที่อาจใช่ใน Authorization Header.');
    }
    // 2. ตรวจสอบ Cookie ถ้าไม่เจอใน header
    else if (req.cookies.token) {
        token = req.cookies.token;
        source = 'Cookie';
        console.log('[verifyToken] พบ token ที่อาจใช่ใน Cookie.');
    }

    // >>>>> เพิ่ม Log นี้ <<<<<
    // Log ค่า token ดิบๆ ทั้งหมดที่ Middleware ได้รับ ก่อนจะ verify
    console.log(`[verifyToken] แหล่งที่มา Token: ${source}. ค่า Token ดิบก่อน verify: >>>${token}<<<`);

    // 3. ถ้าไม่เจอ token เลย หรือ token เป็นค่าว่าง
    // (เพิ่มการเช็ค !token ให้ครอบคลุม null, undefined, '')
    if (!token) {
        console.log('[verifyToken] ไม่พบ token หรือ token เป็นค่าว่าง. กำลังส่ง 401.');
        return res.status(401).json({ error: "Unauthorized: No token provided or empty" }); // ปรับปรุง message
    }

    // 4. ลองตรวจสอบ (verify) token
    try {
        console.log('[verifyToken] กำลังพยายาม verify token...');
        // เพิ่มการตรวจสอบประเภทก่อน verify เผื่อค่าไม่ใช่ string
        if (typeof token !== 'string' || token.trim() === '') {
            console.error('[verifyToken] ค่า Token ไม่ใช่ string หรือเป็นค่าว่าง ไม่สามารถ verify ได้');
            return res.status(401).json({ error: "Invalid token format (not string or empty)" });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('[verifyToken] การ Verify สำเร็จ. ข้อมูลที่ถอดรหัส:', decoded);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('[verifyToken] เกิดข้อผิดพลาดในการ Verify JWT:', err.name, '-', err.message);

        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Token expired" });
        }
        if (err.name === 'JsonWebTokenError' && err.message === 'jwt malformed') {
            // Log token ที่ผิดรูปแบบอีกครั้ง
            console.error('[verifyToken] ค่า Token ที่ผิดรูปแบบ (malformed) คือ:', token);
            return res.status(401).json({ error: "Invalid token format (malformed)" });
        }
        res.status(401).json({ error: "Invalid token" });
    }
}

// ---------- Routes ----------

// Serve หน้า Login เป็นหน้าแรก
app.get("/", (req, res) => res.sendFile(path.join(process.cwd(), "public/login.html"))); //

// ======================================
// ✅ Authentication Routes 
// ======================================

/**
 * POST /api/register - ลงทะเบียนผู้ใช้ใหม่
 * รับ username, password, confirmPassword จาก body
 * ตรวจสอบข้อมูล, hash password, และ insert ลง DB
 */
app.post("/api/register", async (req, res) => {
    const { username, password, confirmPassword } = req.body;

    // --- Input Validation ---
    if (!username || !password || !confirmPassword) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    if (!/^[A-Za-z0-9]{3,30}$/.test(username))
        return res.status(400).json({ error: "Invalid username (3-30 alphanumeric characters)" }); //
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" }); //
    if (password !== confirmPassword) return res.status(400).json({ error: "Passwords do not match!" }); //

    try {
        // --- 1. ตรวจสอบ Username ซ้ำ ---
        const checkUserSql = 'SELECT id FROM "User" WHERE username = $1'; // ใช้ "User" เพราะเป็น case-sensitive ใน PostgreSQL
        const existingUserResult = await pool.query(checkUserSql, [username]);

        if (existingUserResult.rows.length > 0) {
            return res.status(400).json({ error: "Username already exists!" }); //
        }

        // --- 2. Hash Password ---
        const hashed = await bcrypt.hash(password, 10); // ใช้ 10 rounds

        // --- 3. สร้าง User ใหม่ ---
        // ใช้ Parameterized Query ($1, $2, $3) เพื่อป้องกัน SQL Injection
        const insertUserSql = `
      INSERT INTO "User" (username, password, role)
      VALUES ($1, $2, $3)
      RETURNING id, username, role
    `; // RETURNING เพื่อให้ DB ส่งข้อมูล user ที่สร้างกลับมา
        await pool.query(insertUserSql, [username, hashed, "user"]); // role default เป็น user

        res.status(201).json({ message: "Registration successful!" }); // ส่ง 201 Created

    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ error: "Server error during registration" });
    }
});

/**
 * POST /api/login - เข้าสู่ระบบ
 * รับ username, password จาก body
 * ค้นหา user, ตรวจสอบ password, สร้าง JWT และตั้ง HttpOnly Cookie
 */
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    try {
        // --- 1. ค้นหา User ---
        const findUserSql = 'SELECT * FROM "User" WHERE username = $1'; // ดึงข้อมูลทั้งหมดมาเลย
        const userResult = await pool.query(findUserSql, [username]);
        const user = userResult.rows[0]; // ผลลัพธ์อยู่ใน rows[0] ถ้าเจอ

        if (!user) {
            return res.status(401).json({ error: "User not found" }); // ใช้ 401 Unauthorized
        }

        // --- 2. ตรวจสอบ Password ---
        // ต้องเช็คก่อนว่า user มี password ไหม (กรณีสมัครผ่าน Google อาจจะไม่มี)
        if (!user.password) {
            return res.status(401).json({ error: "Incorrect password or login method not supported" }); // แจ้งรวมๆ เพื่อความปลอดภัย
        }
        const match = await bcrypt.compare(password, user.password); //
        if (!match) {
            return res.status(401).json({ error: "Incorrect password or login method not supported" }); //
        }

        // --- 3. สร้าง Token และตั้ง Cookie ---
        const token = createToken(user);
        // secure: true ควรใช้เมื่อ deploy บน HTTPS
        res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: "lax" }); // ปรับ secure และ sameSite ตามสภาพแวดล้อม

        // ส่งข้อมูล user กลับไปให้ frontend (เอา password ออก)
        res.json({
            token: token, // <<<--- เพิ่ม token เข้าไปใน response
            user: { id: user.id, username: user.username, name: user.name || user.username, role: user.role } //
        });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error during login" });
    }
});

/**
 * POST /api/google-login - เข้าสู่ระบบด้วย Google
 * รับ credential (ID Token) จาก Google Sign-In
 * ตรวจสอบ Token, หาหรือสร้าง User ใน DB, สร้าง JWT และตั้ง Cookie
 */
app.post("/api/google-login", async (req, res) => {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Missing credential" }); //

    try {
        // --- 1. Verify Google ID Token ---
        const ticket = await client.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID }); //
        const payload = ticket.getPayload();
        if (!payload) {
            throw new Error("Invalid Google token payload");
        }
        const { sub: googleId, email, name } = payload; //

        // --- 2. ค้นหา User ด้วย google_id 
        // ใช้คอลัมน์ google_id ตาม schema
        const findUserSql = 'SELECT * FROM "User" WHERE google_id = $1';
        let userResult = await pool.query(findUserSql, [googleId]);
        let user = userResult.rows[0];

        // --- 3. ถ้าไม่เจอ สร้าง User ใหม่ ---
        if (!user) {
            // ตรวจสอบ email ซ้ำก่อน (ถ้ามี user ที่ register ด้วย email นี้แล้ว)
            let emailExists = false;
            if (email) {
                const checkEmailSql = 'SELECT id FROM "User" WHERE email = $1 AND google_id IS NULL'; // เช็คเฉพาะ user ที่ไม่ได้มาจาก Google
                const emailResult = await pool.query(checkEmailSql, [email]);
                if (emailResult.rows.length > 0) {
                    // อาจจะเลือกที่จะ link account หรือแจ้ง error
                    return res.status(400).json({ error: "Email already exists with a different login method." });
                }
            }

            // สร้าง user ใหม่
            const insertUserSql = `
        INSERT INTO "User" (name, email, google_id, role)
        VALUES ($1, $2, $3, $4)
        RETURNING * `; //
            userResult = await pool.query(insertUserSql, [name, email, googleId, "user"]); // default role 'user'
            user = userResult.rows[0];
        }

        // --- 4. สร้าง Token และตั้ง Cookie ---
        const token = createToken(user);
        res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: "lax" }); //
        res.json({
            token: token,
            user: { id: user.id, username: user.username, name: user.name, role: user.role } //
        });

    } catch (err) {
        console.error("Google login error:", err);
        res.status(400).json({ error: "Google login failed" }); //
    }
});

/**
 * GET /api/check-session - ตรวจสอบสถานะการ Login
 * ใช้ verifyToken middleware เพื่อตรวจสอบและดึงข้อมูล user จาก token
 */
app.get("/api/check-session", verifyToken, (req, res) => {
    // verifyToken middleware ได้แนบข้อมูล user (จาก payload) ไว้ที่ req.user แล้ว
    res.json({ user: req.user });
});

/**
 * POST /api/logout - ออกจากระบบ
 * ล้าง token cookie ออกจาก browser ของ user
 */
app.post("/api/logout", (req, res) => {
    // ต้องใส่ Options ให้ตรงกับตอนตั้ง cookie เพื่อให้ browser ลบได้ถูกต้อง
    res.clearCookie("token", { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: "lax" });
    res.json({ message: "Logged out successfully" }); //
});

// Protected route: หน้า main.html ต้อง login ก่อน
app.get("/main.html", verifyToken, (req, res) => {
    // verifyToken ผ่าน แสดงว่า login แล้ว
    res.sendFile(path.join(process.cwd(), "public/main.html")); //
});


// ===================================
// Address Routes 
// ===================================

/**
 * GET /api/address - ดึงที่อยู่ของผู้ใช้ที่ login อยู่
 * ใช้ user id จาก verifyToken middleware (req.user.id)
 */
app.get("/api/address", verifyToken, async (req, res) => {
    const userId = req.user.id; // ดึง id จาก middleware

    try {
        // ค้นหาที่อยู่โดยใช้ user_id
        const findAddressSql = 'SELECT * FROM "Address" WHERE user_id = $1';
        const result = await pool.query(findAddressSql, [userId]);
        const address = result.rows[0];

        res.json(address || null);

    } catch (err) {
        console.error("Get address error:", err);
        res.status(500).json({ error: "Server error fetching address" }); //
    }
});

/**
 * PUT /api/address - อัปเดตหรือสร้างที่อยู่ของผู้ใช้
 * ใช้ user id จาก verifyToken middleware (req.user.id)
 * ใช้ SQL UPSERT (INSERT ... ON CONFLICT ... DO UPDATE)
 */
app.put("/api/address", verifyToken, async (req, res) => {
    // ดึงข้อมูลจาก body และ user id จาก token
    const { fullName, house_number, street, city, province, zipCode, phone } = req.body; //
    const userId = req.user.id;

    // --- Input Validation ---
    // เช็คว่า field ที่จำเป็นมีครบ
    if (!fullName || !house_number || !street || !city || !province || !zipCode || !phone) {
        return res.status(400).json({ error: "All address fields are required" });
    }
    // (อาจจะเพิ่ม validation อื่นๆ เช่น รูปแบบเบอร์โทร, รหัสไปรษณีย์)

    try {
        // --- ใช้ UPSERT ของ PostgreSQL ---
        // ถ้ามี user_id อยู่แล้ว (ON CONFLICT) ให้อัปเดต, ถ้ายังไม่มี ให้ INSERT
        // "Address_user_id_key" คือชื่อ unique constraint ที่ Prisma สร้าง
        const upsertSql = `
      INSERT INTO "Address" (user_id, "fullName", house_number, street, city, province, "zipCode", phone)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id)
      DO UPDATE SET
        "fullName" = EXCLUDED."fullName",
        house_number = EXCLUDED.house_number,
        street = EXCLUDED.street,
        city = EXCLUDED.city,
        province = EXCLUDED.province,
        "zipCode" = EXCLUDED."zipCode",
        phone = EXCLUDED.phone
      RETURNING *
    `;

        const result = await pool.query(upsertSql, [
            userId, fullName, house_number, street, city, province, zipCode, phone
        ]);
        const address = result.rows[0]; // ผลลัพธ์ที่ได้จากการ UPSERT

        res.json(address);

    } catch (err) {
        console.error("Update/Create address error:", err);
        res.status(500).json({ error: "Server error updating address" }); //
    }
});


// ==================================
// ✅ Shirt Routes 
// ==================================

/**
 * GET /api/shirts - ดึงรายการเสื้อทั้งหมด
 * เรียงตาม ID จากน้อยไปมาก
 */
app.get("/api/shirts", async (req, res) => {
    try {
        const sql = 'SELECT * FROM "Shirt" ORDER BY id ASC'; //
        const result = await pool.query(sql);
        res.json(result.rows); //
    } catch (err) {
        console.error("Get shirts error:", err);
        res.status(500).json({ error: "Server error fetching shirts" });
    }
});

/**
 * POST /api/shirts - เพิ่มเสื้อใหม่ (Admin only)
 * ใช้ verifyToken และเช็ค role admin
 */
app.post("/api/shirts", verifyToken, async (req, res) => {
    // --- Admin Check ---
    if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden: admin only" });

    // ดึงข้อมูลจาก body
    const { shirt_name, shirt_size, shirt_price, shirt_image } = req.body;

    // --- Input Validation ---
    if (!shirt_name || !shirt_size || shirt_price === undefined || shirt_price === null) // เช็ค price ให้ดีขึ้น
        return res.status(400).json({ error: "Missing required fields (name, size, price)" });
    if (isNaN(parseFloat(shirt_price)) || parseFloat(shirt_price) < 0) {
        return res.status(400).json({ error: "Invalid price format" });
    }


    try {
        // --- สร้าง Shirt ใหม่ ---
        const sql = `
      INSERT INTO "Shirt" (shirt_name, shirt_size, shirt_price, shirt_image)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
        const result = await pool.query(sql, [shirt_name, shirt_size, parseFloat(shirt_price), shirt_image || null]);
        const newShirt = result.rows[0];

        res.status(201).json(newShirt); // ส่ง 201 Created
    } catch (err) {
        console.error("Add shirt error:", err);
        res.status(500).json({ error: "Server error adding shirt" });
    }
});

/**
 * GET /api/shirts/:id - ดึงเสื้อ 1 ชิ้นจาก ID
 */
app.get("/api/shirts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid shirt ID" }); //

    try {
        const sql = 'SELECT * FROM "Shirt" WHERE id = $1'; //
        const result = await pool.query(sql, [id]);
        const shirt = result.rows[0];

        if (!shirt) return res.status(404).json({ error: "Shirt not found" }); //

        res.json(shirt); //
    } catch (err) {
        console.error("Get shirt by ID error:", err);
        res.status(500).json({ error: "Server error fetching shirt" }); //
    }
});

/**
 * PUT /api/shirts/:id - แก้ไขข้อมูลเสื้อ (Admin only)
 * ใช้ verifyToken และเช็ค role admin
 */
app.put("/api/shirts/:id", verifyToken, async (req, res) => {
    // --- Admin Check ---
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden: Admin access only" }); //
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid shirt ID" });

    const { shirt_name, shirt_size, shirt_price, shirt_image } = req.body; //

    // --- Input Validation  ---
    if (!shirt_name || !shirt_size || shirt_price === undefined || shirt_price === null)
        return res.status(400).json({ error: "Missing required fields (name, size, price)" });
    if (isNaN(parseFloat(shirt_price)) || parseFloat(shirt_price) < 0) {
        return res.status(400).json({ error: "Invalid price format" });
    }

    try {
        // --- อัปเดต Shirt ---
        const sql = `
      UPDATE "Shirt"
      SET shirt_name = $1, shirt_size = $2, shirt_price = $3, shirt_image = $4
      WHERE id = $5
      RETURNING *
    `; //
        const result = await pool.query(sql, [
            shirt_name,
            shirt_size,
            parseFloat(shirt_price),
            shirt_image || null, // ถ้า img เป็น null ให้ใส่ null ลง DB
            id
        ]);
        const updatedShirt = result.rows[0];

        // เช็คว่ามี shirt ID นี้จริงไหม (ถ้าไม่มี updatedShirt จะเป็น undefined)
        if (!updatedShirt) {
            return res.status(404).json({ error: "Shirt not found" }); //
        }

        res.json(updatedShirt); //
    } catch (err) {
        console.error("Update shirt error:", err);
        res.status(500).json({ error: "Server error updating shirt" }); //
    }
});

/**
 * DELETE /api/shirts/:id - ลบเสื้อ (Admin only)
 * ใช้ verifyToken และเช็ค role admin
 * ⚠️ ต้องระวัง Foreign Key Constraint ถ้าเสื้อนี้อยู่ใน OrderItem
 */
app.delete("/api/shirts/:id", verifyToken, async (req, res) => {
    // --- Admin Check ---
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden: Admin access only" });
    }

    const shirtId = parseInt(req.params.id);
    if (isNaN(shirtId)) {
        return res.status(400).json({ error: "Invalid shirt ID" }); //
    }

    // ⚠️ Foreign Key: จาก migration, OrderItem มี Foreign Key ไปยัง Shirt
    // โดยไม่ได้ตั้ง ON DELETE CASCADE หรือ SET NULL
    // หมายความว่าถ้าพยายามลบ Shirt ที่มีอยู่ใน OrderItem จะเกิด Error 23503

    try {
        // --- ลบ Shirt ---
        const sql = 'DELETE FROM "Shirt" WHERE id = $1 RETURNING id'; // RETURNING เพื่อเช็คว่าลบได้จริง
        const result = await pool.query(sql, [shirtId]);

        // เช็คว่ามีแถวถูกลบหรือไม่ (result.rowCount)
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Shirt not found" }); //
        }

        res.json({ message: `Shirt with ID ${shirtId} has been deleted` }); //
    } catch (err) {
        console.error("Delete shirt error:", err);
        // ตรวจจับ Foreign Key Violation Error (PostgreSQL code 23503)
        if (err.code === '23503') {
            return res.status(400).json({ error: "Cannot delete shirt: It is currently associated with existing order items." });
        }
        res.status(500).json({ error: "Server error, unable to delete shirt" }); //
    }
});


// ==============================================
// ✅ Cart & Checkout Routes (แปลงแล้ว - ใช้ Transaction)
// ==============================================

/**
 * POST /api/add-to-cart - เพิ่มสินค้าลงตะกร้า (Order ที่ pending)
 * ถ้าไม่มี Order pending จะสร้างใหม่
 * ถ้ามี Item (shirt+size) ซ้ำ จะเพิ่ม quantity, ถ้าไม่มี จะสร้าง Item ใหม่
 * ใช้ Transaction เพื่อความถูกต้องของข้อมูล
 */
app.post("/api/add-to-cart", verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { shirtId, size, price } = req.body; //

    // --- Input Validation ---
    if (!shirtId || !size || price === undefined || price === null) {
        return res.status(400).json({ error: "Missing required fields (shirtId, size, price)" }); //
    }
    if (isNaN(parseInt(shirtId)) || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
        return res.status(400).json({ error: "Invalid shirtId or price format" });
    }

    // ใช้ Transaction เพื่อให้แน่ใจว่าทุกขั้นตอนสำเร็จ หรือ ไม่สำเร็จเลย
    const client = await pool.connect(); // ยืม connection จาก pool

    try {
        await client.query('BEGIN'); // เริ่ม Transaction

        // --- 1. หา Order pending ของ user ---
        const findOrderSql = 'SELECT id FROM "Order" WHERE "userId" = $1 AND status = $2'; //
        let orderResult = await client.query(findOrderSql, [userId, "pending"]);
        let orderId;

        if (orderResult.rows.length > 0) {
            orderId = orderResult.rows[0].id; // เจอ order pending เดิม
        } else {
            // --- 2. ถ้าไม่มี สร้าง Order ใหม่ ---
            const createOrderSql = 'INSERT INTO "Order" ("userId", status) VALUES ($1, $2) RETURNING id'; //
            orderResult = await client.query(createOrderSql, [userId, "pending"]);
            orderId = orderResult.rows[0].id; // ได้ ID ของ order ใหม่
        }

        // --- 3. ตรวจสอบ Item ซ้ำใน Order นี้ (ตาม shirtId และ size) ---
        const findItemSql = 'SELECT id, quantity FROM "OrderItem" WHERE "orderId" = $1 AND "shirtId" = $2 AND size = $3'; //
        const itemResult = await client.query(findItemSql, [orderId, parseInt(shirtId), size]);
        const existingItem = itemResult.rows[0];

        if (existingItem) {
            // --- 4. ถ้าซ้ำ อัปเดต Quantity ---
            const newQuantity = existingItem.quantity + 1;
            const updateQuantitySql = 'UPDATE "OrderItem" SET quantity = $1 WHERE id = $2'; //
            await client.query(updateQuantitySql, [newQuantity, existingItem.id]);
        } else {
            // --- 5. ถ้าไม่ซ้ำ สร้าง Item ใหม่ ---
            const createItemSql = `
        INSERT INTO "OrderItem" ("orderId", "shirtId", size, price, quantity)
        VALUES ($1, $2, $3, $4, $5)
      `; //
            await client.query(createItemSql, [orderId, parseInt(shirtId), size, parseFloat(price), 1]); // quantity เริ่มที่ 1
        }

        // --- 6. ดึงข้อมูลตะกร้าล่าสุดเพื่อส่งกลับ (JOIN Shirt) ---
        // ดึงเฉพาะข้อมูลที่ Frontend ต้องการ
        const getCartSql = `
        SELECT
            oi.id,
            s.shirt_name AS "shirtName",
            oi.size,
            oi.price,
            oi.quantity
        FROM "OrderItem" oi
        JOIN "Shirt" s ON oi."shirtId" = s.id
        WHERE oi."orderId" = $1
        ORDER BY oi.id ASC
    `; // ใช้ Alias "shirtName"
        const cartResult = await client.query(getCartSql, [orderId]);
        const cartItems = cartResult.rows;

        await client.query('COMMIT'); // ยืนยัน Transaction ถ้าทุกอย่างสำเร็จ

        res.json({
            message: "Added to cart", //
            items: cartItems,
        });

    } catch (err) {
        await client.query('ROLLBACK'); // ยกเลิก Transaction ถ้าเกิด error
        console.error("Add to cart error:", err);
        res.status(500).json({ error: "Server error adding to cart" }); //
    } finally {
        client.release(); // คืน connection กลับสู่ pool เสมอ
    }
});


/**
 * POST /api/checkout - ยืนยันคำสั่งซื้อ
 * หา Order "pending", ตรวจสอบว่ามีสินค้า, เปลี่ยน status เป็น "waiting_shipment"
 * ใช้ Transaction
 */
app.post("/api/checkout", verifyToken, async (req, res) => {
    const userId = req.user.id;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        //  1. หา Order pending 
        const findOrderSql = 'SELECT id FROM "Order" WHERE "userId" = $1 AND status = $2 FOR UPDATE';
        // ใช้ FOR UPDATE เพื่อ lock แถวนี้ ป้องกันการ checkout ซ้ำซ้อนพร้อมกัน
        const orderResult = await client.query(findOrderSql, [userId, "pending"]); //

        if (orderResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "No pending order found to checkout." }); //
        }
        const orderId = orderResult.rows[0].id;

        // --- 2. ตรวจสอบว่ามี Item ใน Order หรือไม่ ---
        const countItemsSql = 'SELECT COUNT(*) AS item_count FROM "OrderItem" WHERE "orderId" = $1'; //
        const countResult = await client.query(countItemsSql, [orderId]);
        const itemCount = parseInt(countResult.rows[0].item_count, 10);

        if (itemCount === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: "Cannot checkout an empty cart." }); //
        }

        // --- 3. อัปเดต Status เป็น "waiting_shipment" ---
        const updateStatusSql = 'UPDATE "Order" SET status = $1 WHERE id = $2 RETURNING *'; //
        const updateResult = await client.query(updateStatusSql, ["waiting_shipment", orderId]); //
        const successOrder = updateResult.rows[0];

        await client.query('COMMIT'); // ยืนยันการเปลี่ยนแปลง
        res.json({ message: "Checkout successful!", order: successOrder }); //

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Checkout error:", err);
        res.status(500).json({ error: "Server error during checkout." }); //
    } finally {
        client.release();
    }
});

/**
 * GET /api/orders/history - ดึงประวัติการสั่งซื้อ (ที่ไม่ใช่ pending)
 * ดึง Order พร้อม Items และข้อมูล Shirt ที่เกี่ยวข้อง (ใช้ JOIN)
 */
app.get("/api/orders/history", verifyToken, async (req, res) => {
    const userId = req.user.id;

    try {
        // --- ดึง Orders (ที่ไม่ใช่ pending) ---
        // Status ที่ต้องการคือ success, shipped, waiting_shipment
        const findOrdersSql = `
      SELECT * FROM "Order"
      WHERE "userId" = $1 AND status != $2
      ORDER BY "createdAt" DESC
    `; //
        const ordersResult = await pool.query(findOrdersSql, [userId, "pending"]);
        const orders = ordersResult.rows;

        if (orders.length === 0) {
            return res.json([]); // ส่ง Array ว่างถ้าไม่มีประวัติ
        }

        // --- ดึง Items และ Shirt ของ Order ทั้งหมดทีเดียว ---
        const orderIds = orders.map(o => o.id);
        const findItemsSql = `
      SELECT
        oi.id, oi."orderId", oi."shirtId", oi.size, oi.price, oi.quantity,
        s.shirt_name, s.shirt_image
      FROM "OrderItem" oi
      JOIN "Shirt" s ON oi."shirtId" = s.id
      WHERE oi."orderId" = ANY($1::int[]) -- ใช้ ANY สำหรับ array ของ IDs
      ORDER BY oi."orderId", oi.id -- เรียงเพื่อให้ง่ายต่อการ group
    `; //
        const itemsResult = await pool.query(findItemsSql, [orderIds]);
        const allItems = itemsResult.rows;

        // --- เอา Items ไปใส่ในแต่ละ Order ---
        // สร้าง Map เพื่อให้เข้าถึง items ของแต่ละ order ได้เร็ว
        const itemsByOrderId = allItems.reduce((map, item) => {
            if (!map[item.orderId]) {
                map[item.orderId] = [];
            }
            // จัดรูปแบบ item ให้เหมือนที่ Frontend คาดหวัง
            map[item.orderId].push({
                id: item.id,
                orderId: item.orderId,
                shirtId: item.shirtId,
                size: item.size,
                price: item.price,
                quantity: item.quantity,
                shirt: { // Nested shirt object
                    id: item.shirtId,
                    shirt_name: item.shirt_name,
                    shirt_image: item.shirt_image
                }
            });
            return map;
        }, {});

        // เอา items array ไปใส่ในแต่ละ order object
        orders.forEach(order => {
            order.items = itemsByOrderId[order.id] || []; // ใส่ array ว่างถ้า order นั้นไม่มี item
        });

        res.json(orders); //

    } catch (err) {
        console.error("Get order history error:", err);
        res.status(500).json({ error: "Server error fetching order history" }); //
    }
});

// ==================================
// ✅ Cart Routes (แปลงแล้ว)
// ==================================

/**
 * GET /api/cart - ดึงข้อมูลตะกร้าสินค้าปัจจุบัน (Order ที่ pending)
 * ดึง OrderItem พร้อมข้อมูล Shirt (ใช้ JOIN)
 */
app.get("/api/cart", verifyToken, async (req, res) => {
    const userId = req.user.id;

    try {
        // --- 1. หา Order "pending" ---
        const findOrderSql = 'SELECT id FROM "Order" WHERE "userId" = $1 AND status = $2'; //
        const orderResult = await pool.query(findOrderSql, [userId, "pending"]);

        if (orderResult.rows.length === 0) {
            return res.json({ items: [] }); // ไม่มี order pending, ส่ง array ว่าง
        }
        const orderId = orderResult.rows[0].id;

        // --- 2. ดึง Items พร้อม Shirt (JOIN) ---
        // ดึง field ให้ครบตามที่ frontend (cart.js) ใช้
        const getCartSql = `
        SELECT
            oi.id, oi.size, oi.price, oi.quantity, oi."shirtId",
            s.shirt_name, s.shirt_image, s.shirt_price as original_shirt_price, s.shirt_size as available_shirt_sizes
        FROM "OrderItem" oi
        JOIN "Shirt" s ON oi."shirtId" = s.id
        WHERE oi."orderId" = $1
        ORDER BY oi.id ASC
    `; //
        const itemsResult = await pool.query(getCartSql, [orderId]);

        // จัดรูปแบบให้เหมือน Prisma include ที่ frontend คาดหวัง
        const items = itemsResult.rows.map(row => ({
            id: row.id,
            orderId: orderId, // อาจจะไม่จำเป็น แต่ใส่ไว้เผื่อ
            shirtId: row.shirtId,
            size: row.size,
            price: row.price, // ราคา ณ ตอนกดใส่ตะกร้า
            quantity: row.quantity,
            shirt: { // Nested shirt object
                id: row.shirtId,
                shirt_name: row.shirt_name,
                shirt_size: row.available_shirt_sizes,
                shirt_price: row.original_shirt_price,
                shirt_image: row.shirt_image
            }
        }));

        res.json({ items: items }); // ส่งกลับในรูปแบบ { items: [...] }

    } catch (err) {
        console.error("Get cart error:", err);
        res.status(500).json({ error: "Server error fetching cart" }); //
    }
});


/**
 * DELETE /api/cart/:id - ลบสินค้า (OrderItem) ออกจากตะกร้า
 * :id คือ ID ของ OrderItem
 * ต้องเช็คว่าเป็น Item ของ User ที่ login อยู่ และอยู่ใน Order ที่ pending
 */
app.delete("/api/cart/:id", verifyToken, async (req, res) => {
    const itemId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(itemId)) return res.status(400).json({ error: "Invalid item ID" }); //

    try {
        // --- ลบ Item โดยเช็ค User ID ผ่าน Order ---
        // ใช้ Subquery เพื่อหา orderId ที่เป็นของ userId และ status=pending
        const sql = `
      DELETE FROM "OrderItem"
      WHERE id = $1 AND "orderId" IN (
        SELECT id FROM "Order" WHERE "userId" = $2 AND status = 'pending'
      )
    `; //
        const result = await pool.query(sql, [itemId, userId]);

        // เช็คว่ามีแถวถูกลบหรือไม่
        if (result.rowCount === 0) {
            // อาจจะเพราะ item ID ไม่มีอยู่แล้ว หรือ ไม่ใช่ของ user นี้ หรือ order ไม่ได้ pending แล้ว
            return res.status(404).json({ error: "Item not found in your current cart or permission denied" }); // ปรับปรุง message
        }

        res.json({ success: true, message: "Item deleted" }); //
    } catch (err) {
        console.error("Delete cart item error:", err);
        res.status(500).json({ error: "Unable to delete item" }); //
    }
});


// ==================================
// ✅ Admin Routes 
// ==================================

/**
 * GET /api/admin/orders - (Admin) ดึง Order ทั้งหมด (ที่ไม่ใช่ pending)
 * พร้อมข้อมูล User และ Items (รวม Shirt) โดยใช้ JSON Aggregation
 */
// GET /api/admin/orders - (สำหรับ Admin) ดึง Order (ฉบับ N+1 Query )
app.get("/api/admin/orders", verifyToken, async (req, res) => {
    // --- Admin Check (เหมือนเดิม) ---
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden: Admin access only" });
    }

    try {
        // --- Query 1: ดึงข้อมูล Order พร้อมข้อมูล User (เหมือนเดิม) ---
        const ordersSql = `
            SELECT
                o.id, o."userId", o.status, o."createdAt", o."trackingNumber",
                u.id AS user_id, u.username AS user_username, u.name AS user_name
            FROM "Order" o
            LEFT JOIN "User" u ON o."userId" = u.id
            WHERE o.status != $1
            ORDER BY o."createdAt" DESC
        `;
        const ordersResult = await pool.query(ordersSql, ["pending"]); //
        let orders = ordersResult.rows;

        if (orders.length === 0) {
            return res.json([]);
        }

        // --- วน Loop ที่ Order แต่ละอัน ---
        // ใช้ Promise.all เพื่อรอให้ Query Item ของทุก Order เสร็จพร้อมกัน
        const ordersWithItems = await Promise.all(
            orders.map(async (order) => {
                // --- Query 2 (ยิงซ้ำทุกรอบ): ดึง Item + Shirt เฉพาะของ Order นี้ ---
                const itemsSql = `
                    SELECT
                        oi.id, oi."shirtId", oi.size, oi.price, oi.quantity,
                        s.shirt_name, s.shirt_image
                    FROM "OrderItem" oi
                    LEFT JOIN "Shirt" s ON oi."shirtId" = s.id
                    WHERE oi."orderId" = $1 -- ดึงเฉพาะ Item ของ Order ID นี้
                    ORDER BY oi.id ASC
                `;
                // ส่ง order.id ของ Order ปัจจุบันเข้าไป
                const itemsResult = await pool.query(itemsSql, [order.id]); //
                const items = itemsResult.rows; // ได้ Array Item ของ Order นี้

                // ประกอบร่าง Item ให้มี shirt ซ้อนอยู่ข้างใน (เหมือนเดิม)
                const formattedItems = items.map(item => ({
                    id: item.id,
                    orderId: order.id, // ใส่ orderId กลับเข้าไป
                    shirtId: item.shirtId,
                    size: item.size,
                    price: item.price,
                    quantity: item.quantity,
                    shirt: { // สร้าง nested object 'shirt'
                        id: item.shirtId, // ใช้ shirtId จาก item
                        shirt_name: item.shirt_name,
                        shirt_image: item.shirt_image
                    }
                }));

                // สร้าง object user ซ้อนข้างใน (เหมือนเดิม)
                const userObject = {
                    id: order.user_id,
                    username: order.user_username,
                    name: order.user_name
                };
                // ลบ key เดิมทิ้ง (ถ้าไม่ต้องการ)
                delete order.user_id;
                delete order.user_username;
                delete order.user_name;

                // คืนค่า Order object เดิม เพิ่มเติมด้วย user และ items
                return {
                    ...order,
                    user: userObject,
                    items: formattedItems // เอา Array items ที่ได้ แปะเข้าไปเลย
                };
            }) // จบ .map
        ); // จบ Promise.all

        // ส่งข้อมูล Array ของ orders ที่มี items แล้วกลับไป
        res.json(ordersWithItems);

    } catch (err) {
        console.error("Admin load orders error (N+1 Query):", err);
        res.status(500).json({ error: "Server error fetching orders" });
    }
});

/**
 * PUT /api/admin/orders/:id/status - (Admin) อัปเดตสถานะ Order และ Tracking Number
 * ใช้ verifyToken และเช็ค role admin
 */
app.put("/api/admin/orders/:id/status", verifyToken, async (req, res) => {
    // --- Admin Check ---
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden: Admin access only" }); //
    }

    // --- ดึงข้อมูล ---
    const orderId = parseInt(req.params.id);
    const { status, trackingNumber } = req.body; //
    console.log("Admin update status request for Order ID:", orderId, "Body:", req.body);

    // --- Input Validation ---
    if (isNaN(orderId)) return res.status(400).json({ error: "Invalid Order ID" });
    if (!status) return res.status(400).json({ error: "Missing 'status' in body" }); //

    try {
        // --- สร้าง SQL และ Parameters แบบ Dynamic ---
        let sql;
        let params;
        const updateFields = ['status = $1']; // status ต้องมีเสมอ
        params = [status];

        // ถ้ามี trackingNumber ส่งมา (และไม่ใช่ค่าว่าง) ให้เพิ่ม vào update list และ params
        // ใช้ !== undefined เพื่อให้สามารถส่ง null มาลบ tracking number ได้ (ถ้าต้องการ)
        if (trackingNumber !== undefined) {
            updateFields.push('"trackingNumber" = $2'); // ใช้ double quote ครอบ trackingNumber
            params.push(trackingNumber); // trackingNumber อาจจะเป็น null หรือ string
        }

        params.push(orderId); // ใส่ orderId เป็น parameter ตัวสุดท้าย
        const wherePosition = params.length; // ตำแหน่งของ $ สำหรับ WHERE id

        sql = `
      UPDATE "Order"
      SET ${updateFields.join(', ')}
      WHERE id = $${wherePosition}
      RETURNING *
    `; //

        console.log("Executing SQL:", sql, "with params:", params); // Log SQL และ Params

        //  Execute Query -
        const result = await pool.query(sql, params);
        const updatedOrder = result.rows[0];

        if (!updatedOrder) {
            return res.status(404).json({ error: "Order not found" }); //
        }

        console.log("Order updated successfully:", updatedOrder);
        res.json(updatedOrder); //

    } catch (err) {
        console.error("Admin update status error:", err);
        res.status(500).json({ error: "Server error updating order status" }); //
    }
});

/**
 * GET /api/admin/address/:userId - (Admin) ดึงที่อยู่ของ User จาก User ID
 * ใช้ verifyToken และเช็ค role admin
 */
app.get("/api/admin/address/:userId", verifyToken, async (req, res) => {
    //  Admin Check 
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden: Admin access only" }); //
    }

    //  ดึง User ID จาก URL Parameter 
    const userIdToFetch = parseInt(req.params.userId); //
    if (isNaN(userIdToFetch)) {
        return res.status(400).json({ error: "Invalid User ID" }); //
    }

    try {
        //  ค้นหา Address โดยใช้ user_id 
        const sql = 'SELECT * FROM "Address" WHERE user_id = $1'; //
        const result = await pool.query(sql, [userIdToFetch]);
        const address = result.rows[0];

        if (!address) {
            // ไม่เจอที่อยู่ 404 Not Found
            return res.status(404).json({ error: "Address not found for this user" });
        }

        res.json(address); // ส่งที่อยู่กลับไป

    } catch (err) {
        console.error("Admin fetch address error:", err);
        res.status(500).json({ error: "Server error fetching address" }); //
    }
});


// Start server 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
    console.log(`✅ Server running on port ${PORT}`) //
);