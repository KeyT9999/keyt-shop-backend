# Tiệm Bánh CTV API (tích hợp Netflix)

Tài liệu tham chiếu hành vi API đối tác. **API Key chỉ đặt trên server** (`TIEM_BANH_X_API_KEY` trong `.env` backend), **không** đưa vào frontend hay repo công khai.

## Biến môi trường (KeyT Shop backend)

| Biến | Mô tả |
|------|--------|
| `TIEM_BANH_X_API_KEY` | API Key tạo trên portal CTV Tiệm Bánh. |
| `TIEM_BANH_API_BASE` | Tuỳ chọn. Mặc định trong code: `https://backend-c0r3-7xpq9zn2025.onrender.com` (bỏ dấu `/` cuối). |

## Lấy cookie (sau khi khách đã PayOS PAID — gọi từ backend)

**Endpoint:** `GET {TIEM_BANH_API_BASE}/api/ctv-api/get-cookie`

**Headers:**

- `X-API-Key: <TIEM_BANH_X_API_KEY>`
- `User-Agent`: nên dùng UA trình duyệt chuẩn (code đã set).

**Response mẫu (thành công):**

```json
{
  "success": true,
  "logId": "<id>",
  "cookieNumber": 13,
  "cookie": "NetflixId=...",
  "mobileLoginLink": "https://netflix.com/unsupported?nftoken=...",
  "pcLoginLink": "https://netflix.com/browse?nftoken=...",
  "tokenExpires": 1741234567,
  "timeRemaining": 3600,
  "quota": { "used": 5, "max": 50, "remaining": 45 }
}
```

Trong repo, mapping vào đơn hàng nằm ở [`src/services/tiembanh.service.js`](src/services/tiembanh.service.js) (`mapGetCookieSuccess`) và [`src/services/netflix-order-provision.service.js`](src/services/netflix-order-provision.service.js).

## Làm mới token (regen)

**Endpoint:** `POST {base}/api/ctv-api/regenerate-token`  
**Body:** `{ "logId": "<logId từ get-cookie>" }`  
**Headers:** `X-API-Key`, `Content-Type: application/json`, `User-Agent`.

Partner có thể trả `tokenLink` (mobile); backend chuẩn hoá PC bằng `tokenLink.replace('unsupported', 'browse')` (xem `regenerateToken` trong `tiembanh.service.js`).

## Hạn mức & quota

- **Rate limit:** 10 request / phút — backend dùng hàng đợi cục bộ (`waitForRateLimitSlot`) trên một process.
- **get-cookie:** mỗi lần gọi lấy 1 cookie, **trừ 1 quota** (chung với portal CTV).
- **regenerate-token:** đối chiếu tài liệu Tiệm Bánh xem có trừ quota hay không; luồng regen thất bại có thể fallback `get-cookie` (đã có giới hạn trong [`tiembanh-netflix.routes.js`](src/routes/tiembanh-netflix.routes.js)).

## Bảo mật

- Không nhúng `X-API-Key` vào miniapp/frontend public.
- Không commit file `.env`; rotate key nếu lộ.

## Liên quan

- Checklist deploy shop: [`keyt-shop-frontend/NETFLIX_DEPLOY_CHECKLIST.md`](../keyt-shop-frontend/NETFLIX_DEPLOY_CHECKLIST.md)
