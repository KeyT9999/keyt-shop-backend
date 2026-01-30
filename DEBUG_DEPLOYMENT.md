# 🔍 Hướng dẫn Debug Deployment trên Render

## Vấn đề: Không login được (Google và bình thường)

### Bước 1: Kiểm tra Backend Logs trên Render

1. Vào Render Dashboard → Chọn service `keyt-shop-backend`
2. Click tab **"Logs"**
3. Tìm các dòng sau:

**✅ Nếu thấy:**
```
✅ MongoDB connected successfully
🚀 Server listening on port 10000
```
→ Backend đã chạy OK, tiếp tục Bước 2

**❌ Nếu thấy:**
```
❌ MongoDB connection error: ...
```
→ **Vấn đề:** MongoDB chưa kết nối được
→ **Giải pháp:** Xem phần "Fix MongoDB Connection" bên dưới

**❌ Nếu không thấy logs hoặc service chưa start:**
→ **Vấn đề:** Build/Start command có lỗi
→ **Giải pháp:** Xem phần "Fix Build/Start Issues" bên dưới

### Bước 2: Kiểm tra Environment Variables trên Render

Vào **Environment** tab và đảm bảo có các biến sau:

#### ✅ Bắt buộc phải có:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-min-32-chars
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
FRONTEND_URL=https://www.taphoakeyt.com
```

#### ⚠️ Kiểm tra:
- `MONGODB_URI` có đúng format không? (không có khoảng trắng thừa)
- `JWT_SECRET` có đủ dài không? (tối thiểu 32 ký tự)
- `GOOGLE_CLIENT_ID` có đúng không?

### Bước 3: Test Backend API trực tiếp

Mở terminal và test:

```bash
# 1. Test health check
curl https://your-backend-url.onrender.com/

# Kết quả mong đợi: "KeyT Shop Backend is running 🚀"

# 2. Test products API (không cần auth)
curl https://your-backend-url.onrender.com/api/products

# Kết quả mong đợi: JSON array của products

# 3. Test login endpoint
curl -X POST https://your-backend-url.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Nếu thấy lỗi MongoDB → Database chưa kết nối
# Nếu thấy "Username không tồn tại" → Database đã kết nối OK
```

### Bước 4: Kiểm tra Frontend Configuration

#### 4.1. Kiểm tra Vercel Environment Variables

Vào Vercel Dashboard → Project Settings → Environment Variables

**Cần thêm:**
```
VITE_API_BASE_URL=https://your-backend-url.onrender.com/api
```

**Lưu ý:**
- Thay `your-backend-url` bằng URL thật từ Render
- Sau khi thêm, cần **Redeploy** frontend để áp dụng

#### 4.2. Kiểm tra Browser Console

1. Mở website https://www.taphoakeyt.com
2. Mở Developer Tools (F12)
3. Vào tab **Console**
4. Thử login và xem có lỗi gì không

**Lỗi thường gặp:**
- `Network Error` hoặc `CORS error` → Backend chưa allow origin
- `404 Not Found` → API URL sai
- `500 Internal Server Error` → Backend có lỗi (xem logs)

### Bước 5: Fix MongoDB Connection

#### 5.1. Kiểm tra MongoDB Atlas

1. Vào https://cloud.mongodb.com
2. Chọn cluster của bạn
3. Click **"Network Access"**
4. Đảm bảo có IP `0.0.0.0/0` (allow từ mọi nơi) hoặc IP của Render

#### 5.2. Kiểm tra MongoDB URI

Format đúng:
```
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

**Lưu ý:**
- `username` và `password` phải được URL-encode nếu có ký tự đặc biệt
- `database` là tên database (ví dụ: `keyt-shop`)

#### 5.3. Test MongoDB Connection

Trong Render logs, bạn sẽ thấy:
```
🔄 Attempting to connect to MongoDB...
📍 URI: mongodb+srv://username:***@cluster.mongodb.net/database
✅ MongoDB connected successfully
```

Nếu không thấy → Kiểm tra lại `MONGODB_URI` trong Render Environment Variables

### Bước 6: Fix CORS Issues

Nếu thấy lỗi CORS trong browser console:

1. Kiểm tra `FRONTEND_URL` trong Render đã set đúng chưa
2. Kiểm tra logs backend có dòng: `⚠️ CORS blocked origin: ...`
3. Đảm bảo `src/app.js` có allow `https://www.taphoakeyt.com`

### Bước 7: Fix Google Login

#### 7.1. Kiểm tra Google OAuth Configuration

1. Vào https://console.cloud.google.com
2. Chọn project của bạn
3. Vào **APIs & Services** → **Credentials**
4. Kiểm tra **Authorized JavaScript origins** có:
   - `https://www.taphoakeyt.com`
   - `http://localhost:5173` (cho dev)

5. Kiểm tra **Authorized redirect URIs** có:
   - `https://www.taphoakeyt.com` (nếu cần)

#### 7.2. Kiểm tra GOOGLE_CLIENT_ID

- Đảm bảo `GOOGLE_CLIENT_ID` trong Render khớp với Client ID trong Google Console
- Format: `xxxxx.apps.googleusercontent.com`

### Bước 8: Redeploy sau khi fix

Sau khi sửa Environment Variables:

1. **Backend (Render):**
   - Vào **Manual Deploy** → **Deploy latest commit**
   - Hoặc push code mới lên GitHub

2. **Frontend (Vercel):**
   - Vào **Deployments** → **Redeploy** latest deployment
   - Hoặc push code mới lên GitHub

## 🔧 Quick Fixes

### Fix 1: MongoDB không kết nối được

```bash
# Kiểm tra trong Render logs:
# Nếu thấy: "MONGODB_URI exists: false"
# → Thêm MONGODB_URI vào Render Environment Variables

# Nếu thấy: "authentication failed"
# → Kiểm tra username/password trong MongoDB URI

# Nếu thấy: "timeout" hoặc "ENOTFOUND"
# → Kiểm tra MongoDB Atlas Network Access (whitelist IP)
```

### Fix 2: Frontend không gọi được API

```bash
# 1. Thêm vào Vercel Environment Variables:
VITE_API_BASE_URL=https://your-backend-url.onrender.com/api

# 2. Redeploy frontend

# 3. Kiểm tra trong browser console:
# Mở Network tab → Xem request đến API
# Nếu URL là localhost:5000 → VITE_API_BASE_URL chưa được set
```

### Fix 3: CORS Error

```bash
# 1. Kiểm tra FRONTEND_URL trong Render:
FRONTEND_URL=https://www.taphoakeyt.com

# 2. Redeploy backend

# 3. Kiểm tra logs backend có CORS warning không
```

## 📋 Checklist Debug

- [ ] Backend logs có "✅ MongoDB connected successfully"?
- [ ] Backend logs có "🚀 Server listening on port 10000"?
- [ ] `curl https://your-backend-url.onrender.com/` trả về "KeyT Shop Backend is running 🚀"?
- [ ] `MONGODB_URI` đã được set trong Render?
- [ ] `JWT_SECRET` đã được set trong Render?
- [ ] `GOOGLE_CLIENT_ID` đã được set trong Render?
- [ ] `FRONTEND_URL` đã được set trong Render?
- [ ] `VITE_API_BASE_URL` đã được set trong Vercel?
- [ ] MongoDB Atlas Network Access đã whitelist IP?
- [ ] Google OAuth đã authorize domain Vercel?
- [ ] Frontend đã được redeploy sau khi thêm env vars?

## 🆘 Nếu vẫn không được

1. **Copy toàn bộ logs từ Render** và gửi cho tôi
2. **Copy error từ browser console** và gửi cho tôi
3. **Kiểm tra Network tab** trong browser → Xem request/response details

---

**Sau khi fix xong, test lại:**
1. Login bằng username/password
2. Login bằng Google
3. Tạo đơn hàng
4. Kiểm tra email có được gửi không
