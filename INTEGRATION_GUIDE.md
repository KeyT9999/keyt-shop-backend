# 🔗 Hướng Dẫn Kết Nối Zalo App + Backend

**Ngày tạo:** 13/3/2026  
**Trạng thái:** ✅ Đang hoạt động

---

## 📋 Kiểm Tra Nhanh

- ✅ **Backend API:** Express.js + MongoDB (Port 5000)
- ✅ **Frontend App:** React + Zite + Zalo SDK (Port 3000 or 5173)
- ✅ **Authentication:** JWT + Zalo OAuth
- ✅ **API Interceptors:** Tự động thêm token vào headers
- ✅ **Storage:** Zustand + localStorage
- ✅ **CORS:** Đã cấu hình để cho phép Zalo App

---

## 🚀 Hướng Dẫn Chạy Cả 2 Dự Án

### **Bước 1: Backend Setup**

```bash
cd keyt-shop-backend

# 1. Cài đặt dependencies
npm install

# 2. Kiểm tra .env file (với credentials từ repo)
# File .env đã có sẵn
echo "✅ Backend .env: Sẵn sàng"

# 3. Chạy Backend
npm run dev
# Output: Server running on http://localhost:5000
```

### **Bước 2: Frontend Setup**

```bash
cd keyt-shop-zalo-app

# 1. Cài đặt dependencies
npm install

# 2. Kiểm tra .env.local (tôi vừa tạo)
cat .env.local
# Output: VITE_API_URL=http://localhost:5000/api

# 3. Chạy Frontend
npm run dev
# Output: Vite server running at http://localhost:5173
```

---

## 🔄 API Integration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   ZALO MINI APP (Frontend)                  │
│                  React + Zalo SDK                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User clicks "Đăng nhập Zalo"                          │
│  2. Calls: loginWithZalo()                                │
│     → zmp-sdk/apis.login()                               │
│     → zmp-sdk/apis.getAccessToken()                      │
│     → zmp-sdk/apis.getUserInfo()                         │
│                                                             │
│  3. POST /api/auth/zalo {accessToken, userId, name}      │
│     (Axios interceptor auto-adds JWT token if exists)     │
│                                                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTPS/HTTP
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              KEYT SHOP BACKEND (API Server)                │
│              Express.js + MongoDB                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  POST /api/auth/zalo                                      │
│  │                                                          │
│  ├─ zaloAuthController.loginWithZalo()                   │
│  │  ├─ Find or create User by phone                      │
│  │  ├─ Create JWT token (7 days)                         │
│  │  └─ Return { token, user }                            │
│  │                                                          │
│  └─ Response: 200 OK                                      │
│     {                                                      │
│       "token": "eyJhbGci...",                            │
│       "user": {                                           │
│         "_id": "...",                                     │
│         "username": "zalo_0123456789",                   │
│         "phone": "0123456789",                           │
│         "loginType": "login-zalo"                        │
│       }                                                    │
│     }                                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Token Management

### **Lưu Token**

```typescript
// src/store/auth.store.ts
setAuth: (token, user) => {
  localStorage.setItem('jwt_token', token);
  localStorage.setItem('user_info', JSON.stringify(user));
  set({ token, user });
}
```

### **Gửi Token**

```typescript
// src/utils/api.ts
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});
```

### **Xử Lý Hết Hạn Token**

```typescript
// Nếu backend trả về 401
api.interceptors.response.use(null, (error) => {
  if (error.response?.status === 401) {
    useAuthStore.getState().clearAuth(); // Logout
    // TODO: Gợi ý user đăng nhập lại
  }
  return Promise.reject(error);
});
```

---

## 📡 API Endpoints Được Sử Dụng

### **Authentication (Public)**

```
POST /api/auth/zalo
Content: {
  accessToken: string,      // From ZMP SDK
  userId: string,           // From ZMP SDK
  name: string,            // From ZMP SDK
  phone: string            // From ZMP SDK or app
}
Response: {
  token: string,          // JWT token
  user: {
    _id: string,
    username: string,
    phone: string,
    email: string,
    loginType: 'login-zalo'
  }
}
```

### **Products (Public - No Auth)**

```
GET /api/products
Response: {
  products: [
    {
      _id: string,
      name: string,
      price: number,
      category: string,
      stock: number,
      isPreloadedAccount: boolean,
      preloadedAccounts: [],
      requiredFields: []
    }
  ]
}
```

### **Orders (Protected - Requires JWT)**

```
POST /api/orders
Headers: Authorization: Bearer <token>
Content: {
  items: [
    {
      product: string,           // Product ID
      quantity: number,
      price: number,
      selectedOption?: string,
      requiredData?: object
    }
  ],
  paymentMethod: 'bank_transfer',
  notes?: string,
  source: 'zalo'
}
Response: {
  _id: string,
  userId: string,
  items: [],
  totalPrice: number,
  status: 'pending',
  paymentStatus: 'pending',
  paymentLink?: string,
  createdAt: string
}
```

### **Vault (Protected - Requires JWT)**

```
GET /api/orders/vault
Headers: Authorization: Bearer <token>
Response: [
  {
    _id: string,
    productName: string,
    account: string,         // username:password
    purchasedAt: string,
    expiresAt?: string
  }
]
```

---

## 🟢 Network Configuration

### **CORS Settings (Backend)**

File: `src/app.js` (Lines 25-67)

```javascript
const allowedOrigins = [
  'http://localhost:5173',    // ✅ Zalo App (Vite)
  'http://localhost:3000',    // ✅ Zalo App (npm run dev)
  'https://www.taphoakeyt.com',
  'https://taphoakeyt.com',
];

// ✅ All methods allowed: GET, POST, PUT, DELETE, PATCH
// ✅ Headers: Content-Type, Authorization
```

### **Environment Variables**

#### **Backend (.env)**

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
MONGODB_URL=mongodb+srv://...

# Authentication
JWT_SECRET=...

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Payment
PAYOS_CLIENT_ID=...
PAYOS_API_KEY=...
PAYOS_CHECKSUM_KEY=...

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
```

#### **Frontend (.env.local)**

```env
VITE_API_URL=http://localhost:5000/api
VITE_DEBUG=true
```

---

## 🧪 Testing API Connection

### **Test 1: Check Backend Is Running**

```bash
curl http://localhost:5000
# Expected: "KeyT Shop Backend is running 🚀"
```

### **Test 2: Get Products (Public)**

```bash
curl http://localhost:5000/api/products
# Response: { "products": [...] }
```

### **Test 3: Login with Zalo (Complete Flow)**

```bash
# Step 1: Get access token from Zalo SDK (in app)
# Step 2: Send to backend
curl -X POST http://localhost:5000/api/auth/zalo \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "...",
    "userId": "...",
    "name": "...",
    "phone": "..."
  }'
# Expected: { "token": "...", "user": {...} }
```

### **Test 4: Create Order (Protected)**

```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_from_step3>" \
  -d '{
    "items": [{
      "product": "...",
      "quantity": 1,
      "price": 99000,
      "requiredData": {}
    }],
    "paymentMethod": "bank_transfer",
    "source": "zalo"
  }'
# Expected: Order created with ID
```

---

## ⚠️ Common Issues & Solutions

### **Issue 1: CORS Error**

```
Error: Access to XMLHttpRequest blocked by CORS policy
```

**Giải pháp:**
- ✅ Ensure backend is running on port 5000
- ✅ Check CORS allowedOrigins includes your frontend URL
- ✅ Verify FRONTEND_URL in .env

```bash
# Restart backend
npm run dev
```

### **Issue 2: 401 Unauthorized**

```
Error: {"statusCode": 401, "message": "Invalid token"}
```

**Giải pháp:**
- ✅ Clear localStorage: `localStorage.clear()`
- ✅ Login again via Zalo SDK
- ✅ Check Authorization header: `Bearer <token>`

### **Issue 3: API URL Not Found**

```
Error: Cannot find module 'axios' or API not responding
```

**Giải pháp:**

```bash
# Ensure .env.local has correct API URL
cat .env.local
# Should show: VITE_API_URL=http://localhost:5000/api

# Rebuild frontend
npm run build

# Or restart dev server
npm run dev
```

### **Issue 4: Token Expired**

```
Error: {"statusCode": 401, "message": "Token expired"}
```

**Giải pháp:**
- JWT expires in 7 days
- User needs to login again
- Implement refresh token (future enhancement)

---

## 📋 Checklist: Setup Verification

### **Backend Checks**

- [ ] `npm install` completed
- [ ] `.env` file exists with all required vars
- [ ] MongoDB URL is valid
- [ ] `npm run dev` starts without errors
- [ ] `http://localhost:5000` responds
- [ ] CORS allows localhost:5173

### **Frontend Checks**

- [ ] `npm install` completed
- [ ] `.env.local` file exists
- [ ] `VITE_API_URL=http://localhost:5000/api`
- [ ] `npm run dev` starts without errors
- [ ] `http://localhost:5173` loads in browser
- [ ] Zalo SDK is initialized

### **Integration Checks**

- [ ] Login button works
- [ ] Token is stored in localStorage
- [ ] API calls include Authorization header
- [ ] Products load from backend
- [ ] Can create order
- [ ] Payment page loads

---

## 🔐 Security Notes

### **🚨 CRITICAL - .env Exposure**

⚠️ **Current Status:** MongoDB credentials & API keys are exposed in repo

**Actions Required:**
1. ❌ DO NOT push `.env` to git
2. ✅ Add to `.gitignore`: `echo ".env" >> .gitignore`
3. ✅ Regenerate all credentials:
   - MongoDB password
   - JWT_SECRET
   - API keys (Google, PayOS, Cloudinary)
   - Email password
4. ✅ Update `.env.example` with placeholder values only

```bash
# Immediate action
git rm --cached .env
echo ".env" >> .gitignore
git commit -m "Remove .env from tracking"
```

---

## 📖 File Reference

| File | Purpose | Status |
|------|---------|--------|
| [.env](keyt-shop-backend/.env) | Backend credentials | ⚠️ Keep local only |
| [.env.example](keyt-shop-backend/.env.example) | Backend template | ✅ In repo |
| [.env.local](keyt-shop-zalo-app/.env.local) | Frontend config | ✅ Just created |
| [.env.example](keyt-shop-zalo-app/.env.example) | Frontend template | ✅ Just created |
| [src/utils/api.ts](keyt-shop-zalo-app/src/utils/api.ts) | Axios instance | ✅ Configured |
| [src/services/zaloAuth.service.ts](keyt-shop-zalo-app/src/services/zaloAuth.service.ts) | Zalo auth flow | ✅ Implemented |
| [src/store/auth.store.ts](keyt-shop-zalo-app/src/store/auth.store.ts) | Token storage | ✅ Working |
| [src/routes/auth.routes.js](keyt-shop-backend/src/routes/auth.routes.js) | Auth endpoints | ✅ Ready |

---

## 🔗 Quick Links

- **Backend Home:** http://localhost:5000
- **API Docs:** http://localhost:5000/api/products
- **Frontend:** http://localhost:5173
- **Database:** MongoDB Atlas (requires credentials)

---

**Trang thái:** ✅ Ready for Development  
**Cập nhật lần cuối:** 13/3/2026  
**Người tạo:** AI Assistant (GitHub Copilot)
