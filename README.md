# SmartSpend Backend

Backend API cho ứng dụng quản lý chi tiêu cá nhân SmartSpend (VIMO).

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **AI**: Google Gemini API
- **Authentication**: JWT + Google OAuth
- **Real-time**: Socket.IO
- **File Upload**: Cloudinary
- **Email**: Nodemailer
- **Cron Jobs**: node-cron

## Features

- Authentication (Register, Login, Email Verification, Google OAuth)
- Password Reset (Forgot Password)
- Multi-wallet Management
- Transaction Tracking (Income/Expense)
- Budget Management with Alerts
- Budget Transfer System
- Recurring Transactions
- AI Financial Assistant (Rate Limited: 10 req/min)
- OCR Receipt Scanning (Rate Limited: 5 req/min)
- Push Notifications (Real-time via Socket.IO)
- Analytics & Dashboard API
- Financial Score Calculation

## Installation

```bash
npm install
```

## Environment Variables

Tạo file `.env` với các biến sau:

```env
PORT=8000
MONGO_URI=mongodb://localhost:27017/smartspend
JWT_SECRET=your_jwt_secret_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id

# AI
GEMINI_API_KEY=your_gemini_api_key

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Running

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Đăng ký tài khoản |
| POST | /api/auth/verify-email | Xác thực email |
| POST | /api/auth/login | Đăng nhập |
| POST | /api/auth/google | Đăng nhập Google OAuth |
| POST | /api/auth/forgot-password | Yêu cầu reset mật khẩu |
| POST | /api/auth/reset-password | Đặt lại mật khẩu |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/user/profile | Thông tin người dùng |
| PUT | /api/user/profile | Cập nhật profile |
| POST | /api/user/avatar | Upload avatar |
| GET | /api/user/financial-score | Điểm tài chính (0-100) |

### Wallets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/wallets | Lấy danh sách ví |
| POST | /api/wallets | Tạo ví mới |
| PUT | /api/wallets/:id | Cập nhật ví |
| DELETE | /api/wallets/:id | Xoá ví |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/categories | Lấy danh sách danh mục |
| POST | /api/categories | Tạo danh mục |
| PUT | /api/categories/:id | Cập nhật danh mục |
| DELETE | /api/categories/:id | Xoá danh mục |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/transactions | Lấy danh sách giao dịch |
| GET | /api/transactions/:id | Chi tiết giao dịch |
| GET | /api/transactions/summary | Thống kê chi tiêu |
| POST | /api/transactions | Tạo giao dịch |
| PUT | /api/transactions/:id | Cập nhật giao dịch |
| DELETE | /api/transactions/:id | Xoá giao dịch |
| GET | /api/transactions/export | Xuất dữ liệu (CSV/JSON) |

### Budgets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/budgets | Lấy danh sách ngân sách |
| POST | /api/budgets | Tạo ngân sách |
| PUT | /api/budgets/:id | Cập nhật ngân sách |
| DELETE | /api/budgets/:id | Xoá ngân sách |

### Budget Transfers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/budget-transfers | Lịch sử chuyển ngân sách |
| GET | /api/budget-transfers/pending | Yêu cầu đang chờ |
| POST | /api/budget-transfers | Tạo yêu cầu chuyển |
| POST | /api/budget-transfers/:id/respond | Approve/Reject |

### AI Chat (Rate Limited: 10 req/min)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/chat/history | Lịch sử chat |
| POST | /api/chat | Gửi tin nhắn |
| PATCH | /api/chat/:id/feedback | Feedback like/dislike |

### OCR (Rate Limited: 5 req/min)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/ocr/scan | Quét hóa đơn (base64) |
| POST | /api/ocr/scan-file | Quét hóa đơn (file upload) |
| POST | /api/ocr/upload | Upload ảnh hóa đơn |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/notifications | Lấy thông báo |
| PATCH | /api/notifications/:id/read | Đánh dấu đã đọc |
| PATCH | /api/notifications/read-all | Đánh dấu tất cả đã đọc |
| DELETE | /api/notifications/:id | Xoá thông báo |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/analytics/by-time | Thống kê theo khoảng thời gian |
| GET | /api/analytics/weekly | Thống kê tuần hiện tại |
| GET | /api/analytics/yearly | Thống kê theo năm |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard | Tổng quan dashboard |

## Project Structure

```
src/
├── config/         # Database & Environment config
├── controllers/    # Route handlers
├── middlewares/    # Auth & Rate limiting
├── models/         # Mongoose schemas
│   ├── User.ts
│   ├── Wallet.ts
│   ├── Category.ts
│   ├── Transaction.ts
│   ├── Budget.ts
│   ├── BudgetTransfer.ts
│   ├── Conversation.ts
│   ├── Notification.ts
│   ├── EmailVerification.ts
│   └── PasswordReset.ts
├── routes/         # API routes
├── services/       # Business logic
│   ├── aiService.ts
│   ├── ocrService.ts
│   ├── emailService.ts
│   ├── financialScoreService.ts
│   ├── notificationService.ts
│   ├── socketManager.ts
│   └── cloudinary.ts
├── cron/           # Scheduled jobs
├── utils/          # Helpers & Error messages
└── index.ts        # Entry point
```

## Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| connection | Client → Server | Kết nối socket |
| register | Client → Server | Đăng ký user ID |
| notification | Server → Client | Gửi thông báo real-time |

## Rate Limiting

- **AI Chat**: 10 requests/minute per user
- **OCR Scan**: 5 requests/minute per user

## License

MIT
