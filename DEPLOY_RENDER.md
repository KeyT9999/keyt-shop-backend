# 🚀 Hướng dẫn Deploy Backend lên Render

## Bước 1: Chuẩn bị

### 1.1. Đảm bảo code đã được commit và push lên GitHub
```bash
cd keyt-shop-backend
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 1.2. Kiểm tra các file cần thiết
- ✅ `render.yaml` - File cấu hình Render (đã có sẵn)
- ✅ `package.json` - Có script `start` và `dev`
- ✅ `src/server.js` - Entry point của ứng dụng

## Bước 2: Tạo tài khoản Render

1. Truy cập https://render.com
2. Đăng ký/Đăng nhập bằng GitHub account (khuyến nghị)
3. Kết nối GitHub repository của bạn

## Bước 3: Tạo Web Service trên Render

### 3.1. Tạo service mới
1. Vào Dashboard → Click **"New +"** → Chọn **"Web Service"**
2. Kết nối repository GitHub của bạn
3. Chọn repository `TiemTapHoaKeyT` và branch `main` (hoặc branch bạn muốn deploy)

### 3.2. Cấu hình cơ bản
- **Name**: `keyt-shop-backend` (hoặc tên bạn muốn)
- **Region**: Chọn gần nhất (Singapore hoặc US)
- **Branch**: `main`
- **Root Directory**: `keyt-shop-backend` (nếu repo có cả frontend và backend)
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 3.3. Sử dụng render.yaml (Khuyến nghị)
Thay vì cấu hình thủ công, bạn có thể:
1. Trong phần **"Advanced"** → Chọn **"Use render.yaml"**
2. Render sẽ tự động đọc file `render.yaml` và cấu hình

## Bước 4: Cấu hình Environment Variables

Vào **Environment** tab và thêm các biến sau:

### 4.1. Biến bắt buộc:
```
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://www.taphoakeyt.com
```

### 4.2. Database:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```
*(Thay bằng MongoDB URI thật của bạn)*

### 4.3. Authentication:
```
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 4.4. Email Configuration:
```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=trankimthang0207@gmail.com
MAIL_PASSWORD=lhnigyjvjrqqxuhz
MAIL_FROM=Tiem Tap Hoa KeyT <trankimthang0207@gmail.com>
MAIL_REPLY_TO=trankimthang0207@gmail.com
ADMIN_EMAIL=trankimthang0207@gmail.com
```

### 4.5. Cloudinary (nếu dùng upload ảnh):
```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 4.6. PayOS (nếu dùng thanh toán):
```
PAYOS_CLIENT_ID=your-client-id
PAYOS_API_KEY=your-api-key
PAYOS_CHECKSUM_KEY=your-checksum-key
PAYOS_RETURN_URL=https://www.taphoakeyt.com/orders/:id?payment=success
PAYOS_CANCEL_URL=https://www.taphoakeyt.com/orders/:id?payment=cancelled
```

## Bước 5: Deploy

1. Click **"Create Web Service"**
2. Render sẽ tự động:
   - Clone code từ GitHub
   - Chạy `npm install`
   - Chạy `npm start`
   - Expose service trên URL: `https://keyt-shop-backend.onrender.com` (hoặc custom domain)

## Bước 6: Kiểm tra và Test

### 6.1. Kiểm tra logs
- Vào **Logs** tab để xem quá trình build và start
- Đảm bảo thấy: `✅ MongoDB connected` và `🚀 Server listening on port 10000`

### 6.2. Test API
```bash
# Test health check
curl https://your-backend-url.onrender.com/

# Test products API
curl https://your-backend-url.onrender.com/api/products
```

### 6.3. Cập nhật Frontend API URL
Trong frontend, cập nhật file `src/config/api.ts`:
```typescript
const API_BASE_URL = 'https://your-backend-url.onrender.com/api';
```

## Bước 7: Cấu hình Custom Domain (Tùy chọn)

1. Vào **Settings** → **Custom Domain**
2. Thêm domain của bạn (ví dụ: `api.taphoakeyt.com`)
3. Cấu hình DNS theo hướng dẫn của Render

## Bước 8: Auto-Deploy

Render tự động deploy khi bạn push code lên GitHub. Để tắt:
- Vào **Settings** → **Auto-Deploy** → Tắt nếu cần

## 🔧 Troubleshooting

### Lỗi: "Cannot connect to MongoDB"
- Kiểm tra `MONGODB_URI` có đúng không
- Đảm bảo MongoDB Atlas cho phép kết nối từ mọi IP (0.0.0.0/0) hoặc IP của Render

### Lỗi: "Port already in use"
- Render tự động set PORT, không cần config thủ công
- Đảm bảo code dùng `process.env.PORT`

### Lỗi: "Build failed"
- Kiểm tra logs để xem lỗi cụ thể
- Đảm bảo `package.json` có đầy đủ dependencies
- Kiểm tra Node version compatibility

### Lỗi CORS
- Đảm bảo `FRONTEND_URL` đã được set đúng
- Kiểm tra `src/app.js` có allow origin từ Vercel

## 📝 Lưu ý quan trọng

1. **Free tier**: Render free tier sẽ sleep sau 15 phút không có request. Để tránh:
   - Upgrade lên paid plan ($7/tháng)
   - Hoặc dùng external cron job để ping service mỗi 5 phút

2. **Environment Variables**: 
   - Không commit file `.env` lên GitHub
   - Tất cả secrets phải được set trong Render dashboard

3. **Database**: 
   - Sử dụng MongoDB Atlas (free tier available)
   - Đảm bảo whitelist IP của Render

4. **Logs**: 
   - Render giữ logs trong 7 ngày (free tier)
   - Có thể export logs nếu cần

## ✅ Checklist trước khi deploy

- [ ] Code đã được push lên GitHub
- [ ] `render.yaml` đã được cập nhật với FRONTEND_URL
- [ ] Tất cả environment variables đã được chuẩn bị
- [ ] MongoDB Atlas đã được cấu hình và whitelist IP
- [ ] Test local đã pass (`npm start` chạy OK)
- [ ] Frontend đã được cập nhật với backend URL mới

## 🎉 Sau khi deploy thành công

1. Copy backend URL từ Render dashboard
2. Cập nhật `API_BASE_URL` trong frontend
3. Redeploy frontend lên Vercel
4. Test toàn bộ flow: login, đặt hàng, thanh toán

---

**Chúc bạn deploy thành công! 🚀**
