# Hướng dẫn cấu hình PayOS

## 1. Cấu hình Environment Variables

Thêm các biến môi trường sau vào file `.env` trong thư mục `keyt-shop-backend`:

```env
# PayOS Credentials (Bắt buộc)
PAYOS_CLIENT_ID=your_client_id_here
PAYOS_API_KEY=your_api_key_here
PAYOS_CHECKSUM_KEY=your_checksum_key_here

# PayOS URLs (Tùy chọn - có thể dùng default)
PAYOS_RETURN_URL=http://localhost:5173/payment-success
PAYOS_CANCEL_URL=http://localhost:5173/orders

# Frontend URL (Cần thiết cho PayOS URLs)
FRONTEND_URL=http://localhost:5173
```

## 2. Lấy PayOS Credentials

1. Đăng nhập vào [PayOS Dashboard](https://my.payos.vn)
2. Vào **Kênh thanh toán** (Payment Channel)
3. Copy các thông tin sau:
   - **Client ID** → `PAYOS_CLIENT_ID`
   - **API Key** → `PAYOS_API_KEY`
   - **Checksum Key** → `PAYOS_CHECKSUM_KEY`

## 3. Kiểm tra cấu hình

Sau khi thêm credentials, khởi động lại backend server:

```bash
cd keyt-shop-backend
npm run dev
```

Kiểm tra console log:
- ✅ Nếu thấy: "✅ PayOS payment link created successfully" → PayOS đã hoạt động
- ❌ Nếu thấy: "⚠️ PayOS credentials not configured" → Chưa cấu hình đúng
- ❌ Nếu thấy: "❌ Lỗi tạo payment link PayOS" → Có lỗi khi gọi PayOS API

## 4. Debug PayOS

### Kiểm tra lỗi trong console:

1. **Lỗi "PayOS credentials are not configured"**
   - Kiểm tra file `.env` có đầy đủ 3 biến: `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`
   - Đảm bảo không có khoảng trắng thừa trong giá trị
   - Khởi động lại server sau khi thay đổi `.env`

2. **Lỗi "PayOS API error"**
   - Kiểm tra credentials có đúng không
   - Kiểm tra kênh thanh toán có được kích hoạt chưa
   - Kiểm tra số dư tài khoản PayOS

3. **Order được tạo nhưng không có checkoutUrl**
   - Xem console log backend để biết lỗi cụ thể
   - Có thể tạo payment link sau bằng cách vào trang chi tiết đơn hàng và click "Tạo link thanh toán"

## 5. Test PayOS

1. Tạo một đơn hàng test từ frontend
2. Kiểm tra console backend xem có lỗi gì không
3. Nếu thành công, sẽ tự động redirect đến PayOS checkout page
4. Nếu thất bại, order vẫn được tạo và có thể tạo payment link sau

## 6. Webhook Configuration

Để nhận thông báo thanh toán từ PayOS:

1. Vào PayOS Dashboard → Kênh thanh toán
2. Cấu hình Webhook URL: `https://your-domain.com/api/payos/webhook`
3. Đảm bảo server của bạn có thể nhận request từ internet (không phải localhost)

## 7. Common Issues

### Issue 1: Description quá dài
- PayOS giới hạn description 9 ký tự cho tài khoản không liên kết
- Code đã tự động cắt description xuống 9 ký tự

### Issue 2: Order code trùng lặp
- Order code được tạo từ timestamp + random number
- Nếu vẫn trùng, PayOS sẽ trả về lỗi

### Issue 3: Signature không đúng
- Đảm bảo `PAYOS_CHECKSUM_KEY` đúng với Checksum Key trong PayOS Dashboard
- Signature được tạo từ: `amount`, `cancelUrl`, `description`, `orderCode`, `returnUrl` (sort alphabet)

