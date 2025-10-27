# T-Shirt Shop API Documentation

## 🔑 การยืนยันตัวตน (Authentication)

### `POST /api/register`

  * **การทำงาน:** ลงทะเบียนผู้ใช้ใหม่
  * **Request Body:**
    ```json
    {
      "username": "testuser",
      "password": "password123",
      "confirmPassword": "password123"
    }
    ```
  * **✅ Success Response (200 OK):**
    ```json
    {
      "message": "Registration successful!"
    }
    ```
  * **❌ Error Response (400 Bad Request):**
      * `{ "error": "Invalid username" }`
      * `{ "error": "Password must be at least 8 characters" }`
      * `{ "error": "Passwords do not match!" }`
      * `{ "error": "Username already exists!" }`

-----

### `POST /api/login`

  * **การทำงาน:** เข้าสู่ระบบด้วย Username และ Password
  * **Request Body:**
    ```json
    {
      "username": "testuser",
      "password": "password123"
    }
    ```
  * **✅ Success Response (200 OK):**
      * (Set-Cookie: `token=...; HttpOnly; Secure; SameSite=None`)
    <!-- end list -->
    ```json
    {
      "user": {
        "id": 1,
        "username": "testuser",
        "role": "user"
      }
    }
    ```
  * **❌ Error Response (401 Unauthorized):**
      * `{ "error": "User not found" }`
      * `{ "error": "Incorrect password" }`

-----

### `POST /api/google-login`

  * **การทำงาน:** เข้าสู่ระบบหรือลงทะเบียนด้วย Google
  * **Request Body:**
    ```json
    {
      "credential": "google_id_token_credential_string"
    }
    ```
  * **✅ Success Response (200 OK):**
      * (Set-Cookie: `token=...; HttpOnly; Secure; SameSite=None`)
    <!-- end list -->
    ```json
    {
      "user": {
        "id": 2,
        "username": null,
        "role": "user"
      }
    }
    ```
  * **❌ Error Response (400 Bad Request):**
      * `{ "error": "Missing credential" }`
      * `{ "error": "Google login failed" }`

-----

### `GET /api/check-session`

  * **การทำงาน:** ตรวจสอบสถานะการล็อกอินปัจจุบันจาก `token` ใน Cookie
  * **✅ Success Response (200 OK):**
      * (หากล็อกอินอยู่)
        ```json
        {
          "user": {
            "id": 1,
            "username": "testuser",
            "role": "user"
          }
        }
        ```
      * (หากไม่ได้ล็อกอิน)
        ```json
        {
          "user": null
        }
        ```

-----

### `POST /api/logout`

  * **การทำงาน:** ออกจากระบบ (ล้าง `token` cookie)
  * **✅ Success Response (200 OK):**
      * (Clear-Cookie: `token`)
    <!-- end list -->
    ```json
    {
      "message": "Logged out successfully"
    }
    ```

-----

## 🏠 ที่อยู่ (Address)

*Endpoints กลุ่มนี้ต้องการการเข้าสู่ระบบ (`verifyToken`)*

### `GET /api/address`

  * **การทำงาน:** ดึงที่อยู่ของผู้ใช้ที่กำลังล็อกอินอยู่
  * **✅ Success Response (200 OK):**
      * (หากมีที่อยู่)
        ```json
        {
          "address_id": 1,
          "user_id": 1,
          "city": "Bangkok",
          "street": "123 Main St",
          "province": "Bangkok",
          "phone": "0812345678",
          "house_number": "42",
          "zipCode": "10110",
          "fullName": "Test User"
        }
        ```
      * (หากยังไม่มีที่อยู่)
        ```json
        null
        ```
  * **❌ Error Response (401 Unauthorized):**
      * `{ "error": "Unauthorized" }`

-----

### `PUT /api/address`

  * **การทำงาน:** สร้างหรืออัปเดตที่อยู่ของผู้ใช้ที่กำลังล็อกอิน
  * **Request Body:**
    ```json
    {
      "fullName": "Test User",
      "house_number": "42",
      "street": "123 Main St",
      "city": "Bangkok",
      "province": "Bangkok",
      "zipCode": "10110",
      "phone": "0812345678"
    }
    ```
  * **✅ Success Response (200 OK):**
    ```json
    {
      "address_id": 1,
      "user_id": 1,
      "fullName": "Test User",
      /* ... rest of the fields ... */
    }
    ```
  * **❌ Error Response:**
      * `401 Unauthorized: { "error": "Unauthorized" }`
      * `400 Bad Request: { "error": "All fields are required" }`

-----

## 👕 เสื้อ T-Shirt (Public)

### `GET /api/shirts`

  * **การทำงาน:** ดึงรายการเสื้อทั้งหมด (เรียงจาก ID ล่าสุดไปเก่าสุด)
  * **✅ Success Response (200 OK):**
    ```json
    [
      {
        "id": 2,
        "shirt_name": "Cool Shirt",
        "shirt_size": "M,L,XL",
        "shirt_price": 299.00,
        "shirt_image": "...",
        "shirt_color": []
      },
      {
        "id": 1,
        "shirt_name": "Old Shirt",
        /* ... */
      }
    ]
    ```

-----

### `GET /api/shirts/:id`

  * **การทำงาน:** ดึงข้อมูลเสื้อ 1 ตัวด้วย ID
  * **✅ Success Response (200 OK):**
    ```json
    {
      "id": 2,
      "shirt_name": "Cool Shirt",
      /* ... */
    }
    ```
  * **❌ Error Response (404 Not Found):**
      * `{ "error": "Shirt not found" }`

-----

## 🛒 ตะกร้าสินค้า (Cart & Checkout)

*Endpoints กลุ่มนี้ต้องการการเข้าสู่ระบบ (`verifyToken`)*

### `GET /api/cart`

  * **การทำงาน:** ดึงข้อมูลตะกร้าสินค้า (Order ที่มี `status: "pending"`)
  * **✅ Success Response (200 OK):**
      * (หากมีสินค้า)
        ```json
        {
          "items": [
            {
              "id": 1,
              "orderId": 1,
              "shirtId": 2,
              "size": "L",
              "price": 299.00,
              "quantity": 2,
              "shirt": { /* ... shirt object ... */ }
            }
          ]
        }
        ```
      * (หากตะกร้าว่าง)
        ```json
        {
          "items": []
        }
        ```

-----

### `POST /api/add-to-cart`

  * **การทำงาน:** เพิ่มสินค้าลงในตะกร้า (หรือเพิ่มจำนวนถ้ามีอยู่แล้ว)
  * **Request Body:**
    ```json
    {
      "shirtId": 2,
      "size": "L",
      "price": 299.00
    }
    ```
  * **✅ Success Response (200 OK):**
    ```json
    {
      "message": "Added to cart",
      "items": [
        {
          "id": 1,
          "shirtName": "Cool Shirt",
          "size": "L",
          "price": 299.00,
          "quantity": 1
        }
      ]
    }
    ```

-----

### `DELETE /api/cart/:id`

  * **การทำงาน:** ลบสินค้า (`OrderItem`) ออกจากตะกร้าด้วย `OrderItem ID`
  * **⚠️ หมายเหตุ:** Route นี้มีบั๊ก ขาด `verifyToken` และโค้ดส่วนดึง `userId` จะไม่ทำงาน ทำให้ `items` ที่ส่งกลับมาจะว่างเปล่า (ควรเพิ่ม `verifyToken` และแก้ Logic การ `findMany` ใหม่)
  * **✅ Success Response (200 OK):**
    ```json
    {
      "success": true,
      "items": []
    }
    ```
  * **❌ Error Response (404 Not Found):**
      * `{ "error": "ไม่พบสินค้าในตะกร้า" }`

-----

### `POST /api/checkout`

  * **การทำงาน:** ยืนยันคำสั่งซื้อ (เปลี่ยน `status` จาก "pending" เป็น "success")
  * **✅ Success Response (200 OK):**
    ```json
    {
      "message": "Checkout successful!",
      "order": {
        "id": 1,
        "userId": 1,
        "status": "success",
        /* ... */
      }
    }
    ```
  * **❌ Error Response:**
      * `404 Not Found: { "error": "No pending order found to checkout." }`
      * `400 Bad Request: { "error": "Cannot checkout an empty cart." }`

-----

## ⭐️ ประวัติการสั่งซื้อ (User)

*(คุณมี Endpoint นี้ใน `server.js` แต่ถูก Comment ไว้นะครับ)*

### `GET /api/orders/history`

  * **การทำงาน:** ดึงประวัติการสั่งซื้อของผู้ใช้ (เฉพาะที่ `status: "success"` หรืออื่นๆ ที่ไม่ใช่ "pending")
  * **การยืนยันตัวตน:** **จำเป็น (User)**
  * **✅ Success Response (200 OK):**
    ```json
    [
      {
        "id": 1,
        "userId": 1,
        "status": "success",
        "createdAt": "...",
        "items": [
          {
            "id": 1,
            "shirtId": 2,
            "size": "L",
            "price": 299.00,
            "quantity": 1,
            "shirt": { /* ... shirt object ... */ }
          }
        ]
      }
    ]
    ```

-----

## 💼 ผู้ดูแลระบบ (Admin)

*Endpoints กลุ่มนี้ต้องการการเข้าสู่ระบบเป็นผู้ดูแลระบบ (`verifyToken` และ `role: "admin"`)*

### `POST /api/shirts`

  * **การทำงาน:** (Admin) เพิ่มเสื้อใหม่
  * **การยืนยันตัวตน:** **จำเป็น (Admin)**
  * **Request Body:**
    ```json
    {
      "shirt_name": "New Awesome Shirt",
      "shirt_size": "M,L,XL",
      "shirt_color": [],
      "shirt_price": 39.99,
      "shirt_image": "https://example.com/image.png"
    }
    ```
  * **✅ Success Response (200 OK):**
    ```json
    {
      "id": 3,
      "shirt_name": "New Awesome Shirt",
      /* ... */
    }
    ```
  * **❌ Error Response:**
      * `403 Forbidden: { "error": "Forbidden: admin only" }`
      * `400 Bad Request: { "error": "Missing required fields" }`

-----

### `PUT /api/shirts/:id`

  * **การทำงาน:** แก้ไขข้อมูลเสื้อด้วย ID
  * **⚠️ ข้อควรระวัง:** Route นี้ใน `server.js` **ไม่ได้ป้องกันสิทธิ์ Admin** ใครก็ตามที่ล็อกอินสามารถแก้ไขได้ (ควรเพิ่ม `verifyToken` และเช็ค `role: "admin"`)
  * **Request Body:**
    ```json
    {
      "shirt_name": "Updated Shirt Name",
      "shirt_size": "S,M,L",
      "shirt_price": 45.00,
      "shirt_image": null
    }
    ```
  * **✅ Success Response (200 OK):**
    ```json
    {
      "id": 2,
      "shirt_name": "Updated Shirt Name",
      /* ... */
    }
    ```

-----

### `DELETE /api/shirts/:id`

  * **การทำงาน:** ลบเสื้อด้วย ID
  * **⚠️ ข้อควรระวัง:** Route นี้ใน `server.js` **ไม่ได้ป้องกันสิทธิ์ Admin** เช็คแค่ `verifyToken` (ควรเพิ่มการเช็ค `role: "admin"`)
  * **✅ Success Response (200 OK):**
    ```json
    {
      "message": "Shirt with ID 2 has been deleted"
    }
    ```
  * **❌ Error Response:**
      * `404 Not Found: { "error": "Shirt not found" }`
      * `500 Server error: { "error": "Server error, unable to delete shirt" }` (อาจเกิดจาก `onDelete: Restrict` ถ้าเสื้อถูกสั่งไปแล้ว)

-----

### `GET /api/admin/orders`

  * **การทำงาน:** (Admin) ดึงประวัติการสั่งซื้อทั้งหมด (ที่ไม่ใช่ "pending")
  * **การยืนยันตัวตน:** **จำเป็น (Admin)**
  * **✅ Success Response (200 OK):**
    ```json
    [
      {
        "id": 1,
        "userId": 1,
        "status": "success",
        "createdAt": "...",
        "user": {
          "id": 1,
          "username": "testuser"
        },
        "items": [
          {
            "id": 1,
            "shirtId": 2,
            "shirt": { /* ... shirt object ... */ }
          }
        ]
      }
    ]
    ```
  * **❌ Error Response (403 Forbidden):**
      * `{ "error": "Forbidden: Admin access only" }`

-----

### `PUT /api/admin/orders/:id/status`

  * **การทำงาน:** (Admin) อัปเดตสถานะของ Order (เช่น "success" เป็น "shipped")
  * **การยืนยันตัวตน:** **จำเป็น (Admin)**
  * **Request Body:**
    ```json
    {
      "status": "shipped"
    }
    ```
  * **✅ Success Response (200 OK):**
    ```json
    {
      "id": 1,
      "userId": 1,
      "status": "shipped",
      /* ... */
    }
    ```
  * **❌ Error Response:**
      * `403 Forbidden: { "error": "Forbidden: Admin access only" }`
      * `400 Bad Request: { "error": "Missing 'status' in body" }`

-----

### `GET /api/admin/address/:userId`

  * **การทำงาน:** (Admin) ดึงที่อยู่ของ User คนใดก็ได้ด้วย `userId`
  * **การยืนยันตัวตน:** **จำเป็น (Admin)**
  * **✅ Success Response (200 OK):**
    ```json
    {
      "address_id": 1,
      "user_id": 2,
      "fullName": "Another User",
      /* ... */
    }
    ```
  * **❌ Error Response:**
      * `403 Forbidden: { "error": "Forbidden: Admin access only" }`
      * `400 Bad Request: { "error": "Invalid User ID" }`
      * `404 Not Found: { "error": "Address not found for this user" }`

-----

## 🔒 เส้นทางที่มีการป้องกัน (Protected Pages)

### `GET /main.html`

  * **การทำงาน:** เข้าถึงไฟล์ `main.html`
  * **การยืนยันตัวตน:** **จำเป็น (User)**
  * **✅ Success Response (200 OK):**
      * (ส่งไฟล์ HTML กลับไป)
  * **❌ Error Response (401 Unauthorized):**
      * `{ "error": "Unauthorized" }`
      * `{ "error": "Invalid token" }`