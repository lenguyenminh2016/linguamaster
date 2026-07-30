# LinguaMaster

Ứng dụng học tiếng Anh và tiếng Trung, được tổ chức tách biệt giữa giao diện
người dùng và lớp server.

## Cấu trúc

```text
linguamaster/
├── frontend/
│   ├── index.html
│   ├── assets/css/style.css
│   └── src/js/
│       ├── core/app.js
│       ├── features/
│       │   ├── ai-tutor.js
│       │   ├── exercises.js
│       │   └── progress.js
│       └── services/
│           ├── dictionary.js
│           ├── speech.js
│           └── translator.js
├── backend/
│   ├── package.json
│   ├── start.ps1
│   └── src/
│       ├── server.js
│       └── services/gemini.service.js
├── scripts/
│   └── push-to-github.ps1
├── .env
├── .env.example
└── .gitignore
```

## Chạy dự án

Yêu cầu Node.js 20 trở lên.

```powershell
cd backend
npm.cmd start
```

Sau đó mở `http://localhost:3000`. Kiểm tra backend tại
`http://localhost:3000/api/health`.

Chat AI Giáo Sư gọi Gemini qua `POST /api/tutor`. Khóa
`GEMINI_API_KEY` chỉ được đọc ở backend và không được gửi xuống trình duyệt.
Nếu Gemini không khả dụng, giao diện tự động dùng trợ giảng rule-based cục bộ.

Có thể chạy trực tiếp từ thư mục gốc:

```powershell
.\backend\start.ps1
```
