# 2T Web Downloader

Ứng dụng web tải video hoặc trích xuất âm thanh từ URL, dùng **React + TypeScript** và **FastAPI + yt-dlp + FFmpeg**.

2T Web Downloader phân tích liên kết, hiển thị metadata, cho chọn chất lượng và theo dõi tiến độ tải. Ứng dụng có giao diện Việt/Anh, sáng/tối và hai chế độ lưu file.

> **Lưu ý pháp lý:** Chỉ tải nội dung bạn sở hữu hoặc được phép tải. Người dùng chịu trách nhiệm tuân thủ bản quyền, điều khoản nền tảng và pháp luật địa phương.

## Mục lục

- [Tính năng](#tính-năng)
- [Nền tảng hỗ trợ](#nền-tảng-hỗ-trợ)
- [Cách hoạt động](#cách-hoạt-động)
- [Cấu trúc và công nghệ](#cấu-trúc-và-công-nghệ)
- [Cài đặt trên Windows](#cài-đặt-trên-windows)
- [Cấu hình](#cấu-hình)
- [Khởi chạy và sử dụng](#khởi-chạy-và-sử-dụng)
- [API](#api)
- [Giới hạn](#giới-hạn)
- [Khắc phục sự cố](#khắc-phục-sự-cố)
- [Bảo mật](#bảo-mật)

## Tính năng

### Đã triển khai

- Phân tích URL mà chưa tải file.
- Hiển thị tiêu đề, thumbnail, thời lượng và nền tảng nguồn.
- Liệt kê, chuẩn hóa và loại bỏ format trùng nhau.
- Chọn tự động chất lượng tốt nhất hoặc format cụ thể, đến 8K nếu nguồn có.
- Audio-only; chuyển MP3 192 kbps khi có FFmpeg.
- Ghép video và audio bằng FFmpeg.
- Hiển thị phần trăm, tốc độ, ETA và giai đoạn xử lý.
- Tự chuyển file hoàn tất đến trình duyệt.
- Giao diện Việt/Anh, sáng/tối; theme lưu trong `localStorage`.
- Chế độ `local` và `production`.
- Swagger UI/OpenAPI tự động.

### Chưa triển khai

Một số tài liệu cũ trong `docs/` mô tả mục tiêu thiết kế, không phải chức năng hiện có. Source hiện tại chưa có tải hàng loạt, pause/resume/cancel, lịch sử database, WebSocket, đăng nhập/API key hoặc API cập nhật cấu hình. Frontend theo dõi task bằng polling mỗi giây.

## Nền tảng hỗ trợ

Khả năng hỗ trợ website đến từ [`yt-dlp`](https://github.com/yt-dlp/yt-dlp), gồm YouTube và nhiều nền tảng khác mà phiên bản yt-dlp đang cài nhận diện.

Kết quả phụ thuộc URL, phiên bản yt-dlp, khu vực, trạng thái công khai và thay đổi từ website. Nội dung DRM, riêng tư, trả phí hoặc cần cookie thường không hoạt động với cấu hình hiện tại.

## Cách hoạt động

```mermaid
graph LR
 A[Người dùng dán URL] --> B[POST /api/analyze]
 B --> C[yt-dlp lấy metadata]
 C --> D[Chọn format hoặc audio]
 D --> E[POST /api/download]
 E --> F[BackgroundTasks]
 F --> G[yt-dlp tải]
 G --> H[FFmpeg ghép hoặc đổi MP3]
 I[Frontend poll mỗi giây] --> J[GET /api/tasks/id]
 H --> K[GET /api/downloads/filename]
 K --> L[Trình duyệt lưu file]
```

1. Frontend đọc `GET /api/settings`.
2. `/api/analyze` gọi yt-dlp với `download=False`.
3. Backend chuẩn hóa codec, độ phân giải và dung lượng ước tính.
4. `/api/download` tạo UUID và chạy bằng `FastAPI BackgroundTasks`.
5. Progress hooks cập nhật dictionary trong RAM.
6. Frontend gọi `/api/tasks/{task_id}` mỗi giây.
7. Khi hoàn tất, frontend lấy file qua `/api/downloads/{filename}`.
8. Production xóa file sau khi phục vụ; local giữ file.

## Cấu trúc và công nghệ

```text
2T_Web-Downloader/
├── README.md
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   ├── alembic/                 # Skeleton migration cũ
│   └── app/
│       ├── main.py              # FastAPI và endpoint
│       ├── config.py            # Cấu hình môi trường
│       ├── schemas.py           # Pydantic schema
│       └── engine/downloader.py # yt-dlp, FFmpeg, progress
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.tsx              # API flow và polling
│       ├── config.ts            # API base URL
│       ├── i18n.ts              # Đa ngôn ngữ
│       ├── components/
│       └── locales/
└── docs/                        # Thiết kế và báo cáo lịch sử
```

**Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS 4, Framer Motion, Lucide, i18next, Embla Carousel và OXLint.

**Backend:** Python, FastAPI, Uvicorn, Pydantic, yt-dlp và FFmpeg. SQLAlchemy/Alembic còn trong dependency/skeleton nhưng API hiện tại không dùng database.

> `backend/test_e2e.py` tham chiếu kiến trúc database và chữ ký engine cũ nên hiện không chạy được nếu chưa cập nhật.

## Cài đặt trên Windows

Yêu cầu: Windows 10/11, Python 3.10+, Node.js LTS mới, npm, Internet và đủ dung lượng ổ đĩa.

### Backend

```powershell
cd backend
python -m venv venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install python-dotenv imageio-ffmpeg
Copy-Item .env.example .env -ErrorAction SilentlyContinue
```

`python-dotenv` được source import và `imageio-ffmpeg` dùng để tìm FFmpeg, nhưng hai gói chưa có trong `requirements.txt`, vì vậy cần cài thêm.

### Frontend

```powershell
cd frontend
npm install
```

`venv`, `node_modules` và `dist` có thể tạo lại, không nên commit.

## Cấu hình

Backend đọc `backend/.env` hoặc biến môi trường:

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `APP_MODE` | `local` | `local` hoặc `production`. |
| `DOWNLOAD_DIR` | Theo mode | Thư mục lưu tùy chỉnh. |
| `CLEANUP_AFTER_DOWNLOAD` | Theo mode | Chính sách cleanup hiển thị trong settings. |
| `MAX_HISTORY_ITEMS` | `100` | Đã đọc nhưng chưa dùng vì chưa có lịch sử. |

```dotenv
APP_MODE=local
DOWNLOAD_DIR=E:\Downloads\2T-Downloader
CLEANUP_AFTER_DOWNLOAD=false
MAX_HISTORY_ITEMS=100
```

| Hành vi | Local | Production |
|---|---|---|
| Thư mục mặc định | `backend/downloads` | `backend/temp_downloads` |
| Sau khi trình duyệt nhận file | Giữ file | Xóa file |

Route phục vụ file quyết định cleanup trực tiếp theo `APP_MODE=production`. Frontend dùng API `http://localhost:8000` trong `frontend/src/config.ts`; sửa file nếu backend dùng địa chỉ khác.

## Khởi chạy và sử dụng

### Backend

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- Swagger: <http://localhost:8000/docs>
- OpenAPI: <http://localhost:8000/openapi.json>
- `/` có thể trả 404 vì source không khai báo route gốc.

### Frontend

```powershell
cd frontend
npm run dev
```

Mở URL Vite in trong terminal, thường là <http://localhost:5173>.

### Sử dụng

1. Dán URL và bấm phân tích.
2. Kiểm tra metadata và format.
3. Chọn **Auto**, format cụ thể hoặc **Audio Only**.
4. Bấm tải và theo dõi tiến độ.
5. Trình duyệt tự nhận file khi hoàn tất.

Auto chọn video/audio tốt nhất. Format cụ thể được ghép audio tốt nhất khi có FFmpeg. Audio Only lấy audio tốt nhất và chuyển MP3 192 kbps khi có FFmpeg. Tên file có dạng `Tiêu đề [video_id].ext`.

Preview dùng URL stream trực tiếp; CORS, referrer, URL hết hạn hoặc codec có thể khiến preview không phát dù tải file vẫn hoạt động.

## API

Base URL: `http://localhost:8000`.

### `POST /api/analyze`

```json
{ "url": "https://example.com/video" }
```

Trả metadata và `formats`; lỗi trả HTTP 400 với `detail`.

### `POST /api/download`

```json
{
  "url": "https://example.com/video",
  "format_id": "137",
  "audio_only": false
}
```

Response:

```json
{
  "message": "Download started",
  "task_id": "92bbf23a-3cc9-46b8-91b3-96b3185f1591"
}
```

`url` bắt buộc. Schema còn nhận title, thumbnail, platform, duration và resolution nhưng engine chỉ dùng URL, format ID và audio-only.

### `GET /api/tasks/{task_id}`

```json
{
  "task_id": "92bbf23a-3cc9-46b8-91b3-96b3185f1591",
  "status": "DOWNLOADING",
  "stage": "Downloading... (42.5%)",
  "progress": 42.5,
  "speed": 2541180,
  "eta": 18,
  "downloaded_bytes": 52428800,
  "total_bytes": 123000000,
  "filename": null,
  "error_message": null
}
```

Trạng thái: `QUEUED`, `PREPARING`, `DOWNLOADING`, `MERGING`, `POST_PROCESSING`, `COMPLETED`, `FAILED`. Frontend hiểu `CANCELLED` nhưng backend chưa tạo trạng thái này.

### `GET /api/settings`

Trả thư mục tải, mode, trạng thái/path FFmpeg, phiên bản yt-dlp và chính sách cleanup.

### `GET /api/downloads/{filename}`

Trả file hoàn tất; 404 nếu không tồn tại. Filename phải URL-encode. Production lên lịch xóa file sau khi phục vụ.

Ví dụ PowerShell:

```powershell
Invoke-RestMethod http://localhost:8000/api/settings

Invoke-RestMethod `
  -Uri 'http://localhost:8000/api/analyze' `
  -Method Post `
  -ContentType 'application/json' `
  -Body '{"url":"https://example.com/video"}'
```

## Kiểm tra và build

```powershell
cd frontend
npm run lint
npm run build
```

Build tạo `frontend/dist`. Kiểm tra backend qua `/api/settings` hoặc Swagger. Test E2E cũ cần viết lại trước khi dùng trong CI.

## Giới hạn

- Task chỉ nằm trong RAM; restart làm mất tiến độ.
- Không rate limit, xác thực, quota hoặc giới hạn số task.
- BackgroundTasks không phải queue bền vững hay đa máy chủ.
- Không hủy task, không lịch sử, không tự dọn task RAM cũ.
- Không scheduler dọn file nếu trình duyệt không nhận file.
- UI không truyền cookie, proxy hoặc header tùy chỉnh.
- Không hỗ trợ DRM.
- Không có FFmpeg có thể làm format cao không tiếng; audio-only có thể không thành MP3.
- CORS hiện mở mọi origin.
- Route file cần gia cố chống path traversal trước khi public.
- yt-dlp và website nguồn thay đổi thường xuyên.

## Khắc phục sự cố

### Không kết nối backend

```powershell
Invoke-RestMethod http://localhost:8000/api/settings
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
```

Kiểm tra backend, firewall, port và `API_BASE`.

### Thiếu dotenv hoặc FFmpeg

```powershell
pip install python-dotenv imageio-ffmpeg
```

Restart backend và xem `ffmpeg_available` ở `/api/settings`.

### URL không phân tích được

```powershell
python -m pip install --upgrade yt-dlp
```

Kiểm tra URL công khai, giới hạn vùng/tuổi, đăng nhập, cookie và DRM.

### File không xuất hiện

Kiểm tra `DOWNLOAD_DIR`, quyền ghi/xóa, dung lượng ổ đĩa và log backend. Production xóa file sau khi phục vụ là hành vi dự kiến.

### Video không tiếng

Nguồn có thể cung cấp video-only. Cài FFmpeg để ghép audio.

## Bảo mật

Source phù hợp nhất cho local/mạng tin cậy. Trước khi public:

1. Giới hạn CORS thay vì `*`.
2. Thêm xác thực và rate limiting.
3. Kiểm tra URL để giảm SSRF và chặn IP nội bộ nếu cần.
4. Chuẩn hóa filename chống path traversal.
5. Dùng worker queue bền vững, timeout và quota ổ đĩa.
6. Chạy bằng user quyền tối thiểu và reverse proxy HTTPS.
7. Không commit `.env`, file tải, `venv`, `node_modules`, `dist`.
8. Ghim/cập nhật dependency và dọn file định kỳ.

## Tài liệu bổ sung

[`docs/`](docs/) chứa kiến trúc, roadmap và báo cáo lịch sử. Khi khác biệt, ưu tiên source hiện tại, sau đó README này, rồi tài liệu cũ.

- [`docs/DOWNLOAD_FLOW.md`](docs/DOWNLOAD_FLOW.md)
- [`docs/MODULES.md`](docs/MODULES.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Đóng góp

Giữ Pydantic schema và TypeScript interface đồng bộ; cập nhật README khi API/config thay đổi; chạy lint/build; thêm test backend phù hợp; không commit dependency, secret hoặc file tải.

## Miễn trừ trách nhiệm

Dự án là công cụ cho nội dung hợp pháp. Không khuyến khích vi phạm bản quyền, vượt DRM, truy cập trái phép hoặc vi phạm điều khoản nền tảng. Hãy xin phép chủ sở hữu trước khi tải hoặc phân phối lại.
