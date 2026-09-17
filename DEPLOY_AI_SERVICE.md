# Hướng Dẫn Deploy Dịch Vụ AI Chấm Phát Âm (KeyT Speech AI)

Tài liệu này hướng dẫn chi tiết cách deploy dịch vụ Python Speech AI (`speech-ai-service`) lên môi trường Production (Render, Hugging Face, Railway, hoặc VPS).

---

## 1. Kiến Trúc Hoạt Động Khi Deploy

```
[Trình duyệt học viên]
         │
         ▼ (HTTPS)
[Frontend Vercel] (taphoakeyt.com)
         │
         ▼ (HTTPS: /api/courses/.../speaking/evaluate)
[Backend Node.js - Render] (keyt-shop-backend.onrender.com)
         │
         ▼ (HTTPS: process.env.SPEECH_AI_URL)
[Python Speech AI Microservice] (keyt-speech-ai...)
   ├── FastAPI Server
   ├── FFmpeg (transcode WebM/MP3 -> 16kHz WAV mono)
   ├── faster-whisper (tiny/base model - CPU int8)
   └── Fugashi + UniDic (phân tích ngữ âm/morphology tiếng Nhật)
```

> **Lợi ích kiến trúc này:**
> 1. **Frontend hoàn toàn không cần đổi gì:** Frontend chỉ giao tiếp với Backend Node.js qua `VITE_API_BASE_URL`.
> 2. **Không gặp lỗi CORS:** Trình duyệt không gọi trực tiếp microservice Python.
> 3. **Bảo mật & Tách biệt:** Python service chỉ phục vụ Backend hoặc mạng nội bộ. Backend quản lý giới hạn dung lượng file (25MB) và xác thực người dùng.

---

## 2. Các Lựa Chọn Deploy Python Microservice

### Lựa Chọn 1: Deploy Bằng Docker Trên Render (Khuyên dùng - Cùng hệ thống với Backend)

Do dịch vụ AI cần thư viện hệ thống **FFmpeg** để convert âm thanh, cách chuẩn nhất trên Render là sử dụng **Docker runtime**:

1. Vào **Render Dashboard** (https://dashboard.render.com).
2. Nhấn nút **New +** $\to$ chọn **Web Service**.
3. Chọn Repository GitHub: `KeyT9999/keyt-shop-backend`.
4. Điền các thông số cấu hình:
   - **Name**: `keyt-speech-ai`
   - **Region**: Singapore (hoặc cùng region với backend Node.js)
   - **Environment**: `Docker`
   - **Docker Context**: `speech-ai-service`
   - **Dockerfile Path**: `speech-ai-service/Dockerfile`
   - **Plan Type**: `Free` (hoặc `Starter` $7/tháng để không bị ngủ đông sau 15 phút)
5. Thêm Environment Variables (nếu cần):
   - `PORT`: `8001`
   - `WHISPER_MODEL_SIZE`: `tiny` (mặc định tốn < 150MB RAM, cực nhanh trên CPU)
6. Nhấn **Create Web Service**.
7. Chờ Render build Docker image và khởi động. Sau khi hoàn tất, bạn sẽ nhận được URL:
   `https://keyt-speech-ai.onrender.com`

#### Kết Nối Backend Node.js Với Python Service Trên Render:
1. Vào service `keyt-shop-backend` trên Render Dashboard.
2. Mục **Environment** $\to$ Thêm biến môi trường:
   ```env
   SPEECH_AI_URL=https://keyt-speech-ai.onrender.com
   ```
3. Nhấn **Save Changes** (Render sẽ tự redeploy backend).
4. **Xong!** Toàn bộ tính năng Luyện đọc, Phản xạ Q&A và Thi thử 1-1 sẽ tự động kết nối sang Python service.

---

### Lựa Chọn 2: Deploy Lên Hugging Face Spaces (Miễn Phí 100% - 16GB RAM, 2 vCPU)

Nếu muốn tiết kiệm chi phí và có tài nguyên CPU/RAM mạnh (16GB RAM miễn phí):

1. Tạo tài khoản tại https://huggingface.co
2. Vào **Spaces** $\to$ Chọn **Create new Space**.
3. Đặt tên: `keyt-speech-ai`.
4. Space SDK: Chọn **Docker** (Blank).
5. Clone repo của Space về máy:
   ```bash
   git clone https://huggingface.co/spaces/<username>/keyt-speech-ai
   ```
6. Copy toàn bộ file trong thư mục `keyt-shop-backend/speech-ai-service/` vào thư mục vừa clone.
7. Đổi `EXPOSE 8001` và `PORT=8001` trong `Dockerfile` thành `PORT=7860` (Hugging Face mặc định mở cổng 7860).
8. Commit và push lên Hugging Face:
   ```bash
   git add .
   git commit -m "Deploy KeyT Speech AI"
   git push
   ```
9. Space sẽ tự động build Docker và hiển thị trạng thái `Running`.
10. Lấy link public: `https://<username>-keyt-speech-ai.hf.space`.
11. Gán link này vào Render Backend:
    ```env
    SPEECH_AI_URL=https://<username>-keyt-speech-ai.hf.space
    ```

---

### Lựa Chọn 3: Deploy Lên VPS Riêng (Docker / Ubuntu)

Nếu bạn sở hữu VPS (Ubuntu / Debian):

```bash
# 1. Cài Docker nếu chưa có
sudo apt update && sudo apt install -y docker.io

# 2. Vào thư mục speech-ai-service
cd speech-ai-service

# 3. Build Docker Image
docker build -t keyt-speech-ai:latest .

# 4. Chạy Container (chạy nền, tự khởi động lại khi reboot)
docker run -d \
  --name keyt-speech-ai \
  --restart always \
  -p 8001:8001 \
  -e WHISPER_MODEL_SIZE=tiny \
  keyt-speech-ai:latest

# 5. Kiểm tra trạng thái
docker ps
curl http://localhost:8001/health
# Trả về: {"status":"healthy","service":"keyt-speech-ai","version":"1.0.0"}
```

Sau đó trỏ domain hoặc IP VPS của bạn vào `SPEECH_AI_URL` trên Render.

---

## 3. Tối Ưu Hiệu Năng & RAM Khi Chạy Production

1. **Kích thước Model Whisper (`WHISPER_MODEL_SIZE`)**:
   - `tiny`: RAM ~100MB - Tốc độ inference 0.3s - 0.8s (Khuyên dùng cho Free tier và môi trường production tiêu chuẩn).
   - `base`: RAM ~250MB - Tốc độ inference 0.8s - 1.5s (Độ chính xác cao hơn một chút).
   - Thiết lập qua biến môi trường `WHISPER_MODEL_SIZE=tiny`.
2. **Quantization `int8` trên CPU**:
   - Đã được cấu hình mặc định trong mã nguồn `asr_service.py` giúp giảm 65% dung lượng bộ nhớ và tăng tốc độ xử lý gấp 3 lần so với float32.
3. **Pre-caching trong Dockerfile**:
   - Model đã được tải sẵn trong quá trình `docker build`, giúp container khi boot trên cloud không tốn thời gian tải model và khởi động chỉ trong 1-2 giây.
