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

### 2. Thiết lập `.env`
```bash
# Copy file mẫu và điền URI thật
cp .env.example .env
# Hoặc tạo .env thủ công:
# MONGODB_URL=mongodb+srv://keyt_database:<db_password>@cluster0.0ll6vqh.mongodb.net/?appName=Cluster0
```

Trường hợp chạy local hãy đảm bảo `mongodb://127.0.0.1:27017/TechShopDB` đang sẵn sàng.

### 3. Biến môi trường bảo mật
Trong `.env`, hãy luôn định nghĩa:
```
MONGODB_URL=...
JWT_SECRET=chuoi-bi-mat-rieng
GOOGLE_CLIENT_ID=xxxxxxxxxxx.apps.googleusercontent.com
RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key
```
```
MONGODB_URL=...
JWT_SECRET=chuoi-bi-mat-rieng
GOOGLE_CLIENT_ID=xxxxxxxxxxx.apps.googleusercontent.com
```
`JWT_SECRET` sẽ dùng để tạo và xác minh token khi đăng nhập. `GOOGLE_CLIENT_ID` dùng trong route `/api/auth/google` để xác minh ID token từ Google.

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

## HSK1 and HSK2 Mandarin audio

Vivibe's API key and voice ID belong in the backend `.env` only (`VIVIBE_API_KEY` and `VIVIBE_USER_VOICE_ID`). The generator stores each exported audio URL on its HSK1 vocabulary item in `audioUrl`; later runs skip items that already have a URL, and reseeding preserves those URLs.

```bash
# List account voices and see whether the API provides language metadata
npm run generate:hsk1-audio -- --list-voices

# Check how many HSK1 words still need audio
npm run generate:hsk1-audio -- --dry-run

# Generate one word first so its Mandarin pronunciation can be reviewed
npm run generate:hsk1-audio -- --limit 1

# After confirming the sample, generate every remaining word
npm run generate:hsk1-audio
```

Use the matching HSK2 command to prepare audio for the HSK2 vocabulary:

```bash
npm run generate:hsk2-audio -- --dry-run
npm run generate:hsk2-audio -- --limit 1
npm run generate:hsk2-audio
```

Vivibe's published API docs do not confirm Mandarin support for a voice. The one-word run is a pronunciation check before generating the full list.

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

