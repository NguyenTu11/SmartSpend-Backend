# VIMO Backend - Smart Personal Finance Management

Backend API cho ứng dụng quản lý tài chính cá nhân VIMO, xây dựng với Node.js, Express, TypeScript và MongoDB.

## 🚀 Công nghệ sử dụng

- **Node.js** & **Express** - REST API framework
- **TypeScript** - Type-safe development
- **MongoDB** & **Mongoose** - Database & ODM
- **JWT** - Authentication & Authorization
- **Socket.IO** - Real-time notifications
- **Nodemailer** - Email service
- **Cloudinary** - Image storage
- **Google Gemini AI** - AI financial advisor
- **Tesseract.js** - OCR for receipt scanning
- **Bcrypt** - Password hashing

## 📋 Yêu cầu hệ thống

- Node.js >= 18.0.0
- MongoDB >= 6.0
- npm hoặc yarn

## 🛠️ Cài đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd SmartSpend-Backend
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình môi trường

Tạo file `.env` trong thư mục gốc:

```env
# Server
PORT=8000

# Database
MONGO_URI=mongodb://localhost:27017/smartspend

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-digit-app-password
EMAIL_FROM=VIMO <your-email@gmail.com>

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

**Lưu ý:** Để dùng Gmail, bạn cần tạo App Password tại https://myaccount.google.com/apppasswords

### 4. Chạy ứng dụng

Development mode:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

## 📁 Cấu trúc thư mục

```
src/
├── config/          # Configuration files
├── controllers/     # Request handlers
├── cron/           # Scheduled jobs
├── middlewares/    # Express middlewares
├── models/         # Mongoose models
├── routes/         # API routes
├── services/       # Business logic & external services
├── types/          # TypeScript type definitions
└── utils/          # Helper functions
```

## 🔑 Tính năng chính

### Authentication
- ✅ Email/Password registration & login
- ✅ Google OAuth 2.0
- ✅ Email verification
- ✅ Password reset
- ✅ JWT token authentication
- ✅ Rate limiting (login, email)

### Core Features
- **Wallets** - Quản lý ví tiền (tiền mặt, ngân hàng, thẻ)
- **Categories** - Phân loại thu chi
- **Transactions** - Ghi nhận giao dịch (thu/chi, định kỳ)
- **Budgets** - Lập ngân sách theo danh mục
- **Budget Transfer** - Chuyển ngân sách giữa các danh mục
- **OCR** - Scan hóa đơn tự động
- **AI Chat** - Tư vấn tài chính bằng AI
- **Analytics** - Thống kê, báo cáo chi tiết
- **Notifications** - Thông báo real-time

### Security & Validation
- ✅ Input validation & sanitization (100+ rules)
- ✅ XSS protection
- ✅ Rate limiting
- ✅ User data isolation
- ✅ Password strength enforcement
- ✅ Amount & date validation

## 🌐 API Endpoints

### Auth
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/verify-email` - Xác thực email
- `POST /api/auth/resend-code` - Gửi lại mã code
- `POST /api/auth/forgot-password` - Quên mật khẩu
- `POST /api/auth/reset-password` - Đặt lại mật khẩu
- `POST /api/auth/google` - Đăng nhập Google

### User
- `GET /api/user/profile` - Lấy thông tin user
- `PUT /api/user/profile` - Cập nhật profile
- `GET /api/user/financial-score` - Điểm tài chính

### Wallets
- `GET /api/wallets` - Danh sách ví
- `POST /api/wallets` - Tạo ví mới
- `PUT /api/wallets/:id` - Cập nhật ví
- `DELETE /api/wallets/:id` - Xóa ví

### Transactions
- `GET /api/transactions` - Danh sách giao dịch (có filter, search, pagination)
- `POST /api/transactions` - Tạo giao dịch
- `PUT /api/transactions/:id` - Cập nhật giao dịch
- `DELETE /api/transactions/:id` - Xóa giao dịch
- `GET /api/transactions/summary` - Tổng kết thu chi
- `GET /api/transactions/export` - Xuất dữ liệu (CSV/JSON)

### Budgets
- `GET /api/budgets` - Danh sách ngân sách
- `POST /api/budgets` - Tạo ngân sách
- `PUT /api/budgets/:id` - Cập nhật ngân sách
- `DELETE /api/budgets/:id` - Xóa ngân sách
- `GET /api/budgets/status` - Trạng thái ngân sách

### OCR
- `POST /api/ocr/scan` - Scan hóa đơn (base64)
- `POST /api/ocr/scan-file` - Scan hóa đơn (file upload)

### AI Chat
- `POST /api/chat` - Gửi tin nhắn
- `GET /api/chat/history` - Lịch sử chat

### Analytics
- `GET /api/analytics/overview` - Tổng quan
- `GET /api/analytics/by-category` - Theo danh mục
- `GET /api/analytics/trends` - Xu hướng chi tiêu
- `GET /api/analytics/comparison` - So sánh theo tháng

### Dashboard
- `GET /api/dashboard` - Dữ liệu tổng quan dashboard

## 🔐 Environment Variables

Xem file `.env.example` để biết các biến môi trường cần thiết.

## 📦 Deployment

### Render.com

1. Tạo MongoDB Atlas cluster
2. Tạo Web Service mới trên Render
3. Connect repository
4. Cấu hình Environment Variables
5. Deploy

Chi tiết xem: https://render.com/docs

## 🧪 Testing

Sử dụng Postman hoặc Thunder Client:

1. Import collection từ `/postman`
2. Cập nhật base URL và token
3. Test các endpoints

## 📝 License

MIT License

## 👥 Contributors

- Your Name

## 📞 Contact

- Email: support@vimo.com
- Website: https://vimo.com

---

Made with ❤️ for VIMO
