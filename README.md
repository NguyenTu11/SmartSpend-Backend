# SmartSpend Backend

Backend API cho ứng dụng quản lý chi tiêu cá nhân SmartSpend.

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **AI**: Google Gemini API
- **Authentication**: JWT
- **Cron Jobs**: node-cron

## Features

- Authentication (Register, Login, Email Verification)
- Multi-wallet Management
- Transaction Tracking (Income/Expense)
- Budget Management with Alerts
- Budget Transfer System
- Recurring Transactions
- AI Financial Assistant (Rate Limited)
- Push Notifications
- Expense Summary Dashboard API

## Installation

```bash
npm install
```

## Environment Variables

Tạo file `.env` với các biến sau:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smartspend
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
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
| GET | /api/transactions/summary | Thống kê chi tiêu |
| POST | /api/transactions | Tạo giao dịch |
| PUT | /api/transactions/:id | Cập nhật giao dịch |
| DELETE | /api/transactions/:id | Xoá giao dịch |

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

### AI Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/chat/history | Lịch sử chat |
| POST | /api/chat | Gửi tin nhắn (Rate Limited) |
| PATCH | /api/chat/:id/feedback | Feedback like/dislike |

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
| GET | /api/analytics/by-time?from=&to=&groupBy= | Thống kê theo khoảng thời gian |
| GET | /api/analytics/weekly | Thống kê tuần hiện tại |
| GET | /api/analytics/yearly?year= | Thống kê theo năm |

### User / Financial Score
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/user/profile | Thông tin người dùng |
| GET | /api/user/financial-score | Điểm tài chính (0-100) |

### OCR
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/ocr/scan | Quét hóa đơn |

## Project Structure

```
src/
├── config/         # Database & Environment config
├── controllers/    # Route handlers
├── middlewares/    # Auth & Rate limiting
├── models/         # Mongoose schemas
├── routes/         # API routes
├── services/       # Business logic (AI, OCR, Financial Score)
├── cron/           # Scheduled jobs
├── utils/          # Helpers & Error messages
└── index.ts        # Entry point
```

## License

MIT
