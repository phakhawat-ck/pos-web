// import pkg from 'pg';
// const { Pool } = pkg;

// const pool = new Pool({
//   user: 'postgres',
//   host: 'localhost',
//   database: 'posdb',
//   password: 'rootroot',
//   port: 5432,
// });

// export default pool;

// 1. นำเข้า dotenv และเรียกใช้การตั้งค่า (ควรเรียกใช้ก่อนที่จะใช้ process.env)
import 'dotenv/config'; // หรือ require('dotenv').config();

import pkg from 'pg';
const { Pool } = pkg;

// 2. สร้าง Pool โดยใช้ DATABASE_URL
// ถ้า Pool ถูกสร้างด้วย string connection (DATABASE_URL) จะไม่จำเป็นต้องใส่ user, host, database, etc.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;