# Shirt Shop API Documentation

เอกสารสรุป API Endpoints ทั้งหมดสำหรับโปรเจกต์ Shirt Shop

**หมายเหตุ:** Endpoints ส่วนใหญ่ (ยกเว้น `Authentication` และ `Public`) ต้องมีการ Login และส่ง `token` (JWT) ผ่าน Cookie (`verifyToken`)

## Authentication (การยืนยันตัวตน)

| Endpoint | Method | Description | Body (JSON) |
| :--- | :--- | :--- | :--- |
| `/api/register` | `POST` | ลงทะเบียนผู้ใช้ใหม่ | `{ "username": "...", "password": "...", "confirmPassword": "..." }` |
| `/api/login` | `POST` | เข้าสู่ระบบ (รับ Token Cookie) | `{ "username": "...", "password": "..." }` |
| `/api/google-login` | `POST` | เข้าสู่ระบบด้วย Google (รับ Token Cookie) | `{ "credential": "..." }` |
| `/api/check-session`| `GET` | ตรวจสอบ Session จาก Token Cookie | *(None)* |
| `/api/logout` | `POST` | ออกจากระบบ (ลบ Token Cookie) | *(None)* |

## Public (ข้อมูลสาธารณะ)

| Endpoint | Method | Description | Body (JSON) |
| :--- | :--- | :--- | :--- |
| `/api/shirts` | `GET` | ดึงรายการเสื้อทั้งหมด | *(None)* |
| `/api/shirts/:id` | `GET` | ดึงข้อมูลเสื้อ 1 ชิ้นจาก `id` | *(None)* |

## User (ผู้ใช้ที่ Login แล้ว)

*Endpoints กลุ่มนี้ต้องมีการ Login (`verifyToken`)*

| Endpoint | Method | Description | Body (JSON) |
| :--- | :--- | :--- | :--- |
| `/api/address` | `GET` | ดึงที่อยู่ของผู้ใช้ที่ login อยู่ | *(None)* |
| `/api/address` | `PUT` | อัปเดต (หรือสร้าง) ที่อยู่ของผู้ใช้ | `{ "fullName": "...", "house_number": "...", "street": "...", "city": "...", "province": "...", "zipCode": "...", "phone": "..." }` |
| `/api/orders/history` | `GET` | ดึงประวัติการสั่งซื้อ (ที่ไม่ใช่ pending) | *(None)* |

## Cart & Checkout (ตะกร้าและการสั่งซื้อ)

*Endpoints กลุ่มนี้ต้องมีการ Login (`verifyToken`)*

| Endpoint | Method | Description | Body (JSON) |
| :--- | :--- | :--- | :--- |
| `/api/cart` | `GET` | ดึงรายการสินค้าในตะกร้า (Order ที่ pending) | *(None)* |
| `/api/add-to-cart` | `POST` | เพิ่มสินค้าลงในตะกร้า | `{ "shirtId": 1, "size": "L", "price": 250.00 }` |
| `/api/cart/:id` | `DELETE`| ลบสินค้าออกจากตะกร้า (`:id` คือ `OrderItem` ID) | *(None)* |
| `/api/checkout` | `POST` | ยืนยันการสั่งซื้อ (เปลี่ยน status เป็น 'waiting_shipment') | *(None)* |

## Admin (สำหรับผู้ดูแลระบบ)

*Endpoints กลุ่มนี้ต้อง Login เป็น Admin (`verifyToken` และ `role: 'admin'`)*

### Admin: Shirt Management (จัดการสินค้า)

| Endpoint | Method | Description | Body (JSON) |
| :--- | :--- | :--- | :--- |
| `/api/shirts` | `POST` | เพิ่มเสื้อใหม่ | `{ "shirt_name": "...", "shirt_size": "S,M,L", "shirt_color": "...", "shirt_price": 290, "shirt_image": "..." }` |
| `/api/shirts/:id` | `PUT` | แก้ไขข้อมูลเสื้อ | `{ "shirt_name": "...", "shirt_size": "...", "shirt_price": ..., "shirt_image": "..." }` |
| `/api/shirts/:id` | `DELETE`| ลบเสื้อ | *(None)* |

### Admin: Order & User Management (จัดการออเดอร์และผู้ใช้)

| Endpoint | Method | Description | Body (JSON) |
| :--- | :--- | :--- | :--- |
| `/api/admin/orders` | `GET` | ดึง Order ทั้งหมด (ที่ไม่ใช่ 'pending') | *(None)* |
| `/api/admin/orders/:id/status` | `PUT` | อัปเดตสถานะ Order (เช่น 'shipped', 'success') | `{ "status": "shipped" }` |
| `/api/admin/address/:userId` | `GET` | ดึงที่อยู่ของ User จาก `userId` | *(None)* |