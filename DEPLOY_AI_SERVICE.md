# Hướng Dẫn Deploy Dịch Vụ AI Chấm Phát Âm (KeyT Speech AI)

Tài liệu này hướng dẫn chi tiết cách deploy dịch vụ Python Speech AI (`speech-ai-service`) lên môi trường Production (Render, Hugging Face, Railway, hoặc VPS).

---

## 1. Kiến Trúc Hoạt Động (Gộp Chung 1 Web Service Duy Nhất Trên Render)

Toàn bộ hệ thống Backend Node.js và Python Speech AI đã được đóng gói chung vào **1 Docker Container duy nhất** để tận dụng tối đa gói Render Starter ($7/tháng) mà bạn đang trả tiền:

```
[Trình duyệt học viên]
         │
         ▼ (HTTPS)
[Frontend Vercel] (taphoakeyt.com)
         │
         ▼ (HTTPS: /api/courses/.../speaking/evaluate)
┌─────────────────────────────────────────────────────────────┐
│  Render Web Service (Gói Starter - 512MB RAM - $7/tháng)     │
│                                                             │
│  [Node.js Express Backend] (Listening on $PORT 10000)        │
│          │                                                  │
│          ▼ (Loopback nội bộ: http://127.0.0.1:8001)         │
│  [Python Speech AI Service] (Listening on 127.0.0.1:8001)    │
│     ├── FastAPI Server                                      │
│     ├── FFmpeg (transcode WebM/MP3 -> 16kHz WAV mono)       │
│     ├── faster-whisper (tiny model - CPU int8 ~100MB RAM)   │
│     └── Fugashi + UniDic (phân tích ngữ âm tiếng Nhật)      │
└─────────────────────────────────────────────────────────────┘
```

> **Lợi ích kiến trúc gộp chung:**
> 1. **Chi phí $0 phát sinh thêm:** Không cần tạo và trả tiền cho 2 Web Service riêng biệt.
> 2. **Tiết kiệm RAM:** Node.js (~60MB) + Python Whisper (~120MB) = ~180MB RAM (hoàn toàn nằm trong giới hạn 512MB của gói Starter).
> 3. **Độ trễ = 0ms:** Node.js gọi sang Python qua cổng nội bộ `127.0.0.1:8001`, không qua internet công cộng, tốc độ phản hồi cực nhanh.
> 4. **Tự động triển khai:** Chỉ cần push code lên GitHub, Render tự build Docker và chạy script `start.sh` để khởi động cả 2 dịch vụ.

---

## 2. Cách Cấu Hình Trên Render Dashboard (Nếu Service Đã Có Sẵn)

Nếu bạn đã có Web Service `keyt-shop-backend` trên Render:

1. Vào **Render Dashboard** $\to$ Chọn service `keyt-shop-backend`.
2. Vào mục **Settings**:
   - **Environment**: Đổi sang `Docker` (Render sẽ tự động nhận diện file `Dockerfile` ở thư mục gốc).
   - **Dockerfile Path**: `Dockerfile`
   - **Docker Context**: `.`
3. Vào mục **Environment Variables**:
   - `SPEECH_AI_URL`: `http://127.0.0.1:8001` (mặc định đã được cấu hình trong `Dockerfile`).
   - `WHISPER_MODEL_SIZE`: `tiny` (mặc định).
4. Nhấn **Save Changes** và **Manual Deploy** $\to$ **Clear build cache & deploy**.
5. Render sẽ:
   - Cài đặt Python 3.11, Node.js 20, FFmpeg.
   - Tải và nạp sẵn model `tiny` vào Docker layer (chỉ tải 1 lần lúc build, không tải lại khi chạy).
   - Khởi động cả Python FastAPI (port 8001) và Node.js Express (port 10000).

---

## 3. Các Lựa Chọn Khác (Dành cho mở rộng trong tương lai)

### Lựa Chọn Dự Phòng: Deploy Python Riêng Lên Hugging Face Spaces (Miễn Phí 100% - 16GB RAM)

Nếu sau này lưu lượng người học đông và bạn muốn tách riêng microservice Python sang một máy chủ miễn phí cấu hình khủng:

1. Tạo tài khoản tại https://huggingface.co
2. Vào **Spaces** $\to$ Chọn **Create new Space**.
3. Đặt tên: `keyt-speech-ai`, Space SDK: chọn **Docker** (Blank).
4. Copy toàn bộ file trong thư mục `keyt-shop-backend/speech-ai-service/` lên repo Space.
5. Gán biến `PORT=7860` (Hugging Face dùng cổng 7860).
6. Lấy link public: `https://<username>-keyt-speech-ai.hf.space`.
7. Gán biến môi trường `SPEECH_AI_URL` trên Render về link Hugging Face này.
