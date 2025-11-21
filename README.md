# 🏪 KeyT Shop Backend

Backend API cho **Tiệm Tạp Hóa KeyT** - Quản lý sản phẩm Canva Pro và các dịch vụ khác.

## 📂 Cấu trúc thư mục

```
keyt-shop-backend/
├── src/
│   ├── config/
│   │   └── db.js              # Kết nối MongoDB
│   ├── models/
│   │   └── product.model.js   # Schema Product
│   ├── routes/                # (Dự phòng cho sau này)
│   └── server.js              # File chính của server
├── package.json
└── README.md
```

## 🚀 Cài đặt & Chạy

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Đảm bảo MongoDB đang chạy
```bash
# Kiểm tra MongoDB đang chạy trên port 27017
# Database: TechShopDB
```

### 3. Chạy backend

**Development mode (tự động restart khi code thay đổi):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

## 📡 API Endpoints

### 1. Test server
```
GET http://localhost:5000/
```
**Response:** `KeyT Shop Backend is running 🚀`

### 2. Lấy danh sách tất cả products
```
GET http://localhost:5000/api/products
```
**Response:** Array of products (bao gồm Canva Pro 189K/năm)

### 3. Lấy chi tiết 1 product
```
GET http://localhost:5000/api/products/:id
```
**Response:** Object của product cụ thể

## 🗃️ Product Schema

```javascript
{
  name: String,           // "Canva Pro"
  price: Number,          // 189000
  currency: String,       // "VNĐ"
  billingCycle: String,   // "năm"
  category: String,       // "Thiết kế"
  isHot: Boolean,         // true
  promotion: String,      // "Giảm 30%"
  features: [String],     // ["Truy cập hơn 100 triệu ảnh", ...]
  description: String,
  imageUrl: String,
  stock: Number
}
```

## ✅ Checklist Test

- [ ] Server chạy thành công trên port 5000
- [ ] MongoDB kết nối thành công (thấy ✅ MongoDB connected)
- [ ] Truy cập `http://localhost:5000/` thấy message
- [ ] Truy cập `http://localhost:5000/api/products` thấy dữ liệu Canva Pro

## 🔧 Tech Stack

- **Node.js** + **Express.js** - Server framework
- **MongoDB** + **Mongoose** - Database
- **CORS** - Cho phép Frontend gọi API
- **Nodemon** - Auto-restart trong development

---

Made with ❤️ for **Tiệm Tạp Hóa KeyT**

