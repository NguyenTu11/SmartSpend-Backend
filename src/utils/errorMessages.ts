export const ErrorMessages = {
    REQUIRED_FIELDS: "Vui lòng điền đầy đủ thông tin bắt buộc",
    INVALID_EMAIL: "Email không hợp lệ",
    INVALID_PASSWORD: "Mật khẩu phải có ít nhất 6 ký tự",
    EMAIL_EXISTS: "Email này đã được sử dụng",
    INVALID_CREDENTIALS: "Email hoặc mật khẩu không chính xác",
    EMAIL_NOT_VERIFIED: "Vui lòng xác thực email trước khi đăng nhập",
    USER_NOT_FOUND: "Không tìm thấy người dùng",

    NO_TOKEN: "Vui lòng đăng nhập để tiếp tục",
    INVALID_TOKEN: "Phiên đăng nhập không hợp lệ",
    TOKEN_EXPIRED: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",

    WALLET_NOT_FOUND: "Không tìm thấy ví",
    WALLET_NAME_REQUIRED: "Vui lòng nhập tên ví",
    WALLET_DELETE_HAS_TRANSACTIONS: "Không thể xoá ví đã có giao dịch",

    CATEGORY_NOT_FOUND: "Không tìm thấy danh mục",
    CATEGORY_NAME_REQUIRED: "Vui lòng nhập tên danh mục",
    CATEGORY_DELETE_HAS_TRANSACTIONS: "Không thể xoá danh mục đã có giao dịch",

    TRANSACTION_NOT_FOUND: "Không tìm thấy giao dịch",
    TRANSACTION_REQUIRED_FIELDS: "Vui lòng chọn ví, danh mục, loại và số tiền",
    TRANSACTION_INVALID_TYPE: "Loại giao dịch phải là thu nhập hoặc chi tiêu",
    TRANSACTION_INVALID_AMOUNT: "Số tiền phải lớn hơn 0",
    TRANSACTION_ID_REQUIRED: "Vui lòng chọn giao dịch cần thao tác",

    BUDGET_NOT_FOUND: "Không tìm thấy ngân sách",
    BUDGET_REQUIRED_FIELDS: "Vui lòng nhập đầy đủ thông tin ngân sách",
    BUDGET_INVALID_LIMIT: "Hạn mức phải lớn hơn 0",

    TRANSFER_NOT_FOUND: "Không tìm thấy yêu cầu chuyển ngân sách",
    TRANSFER_REQUIRED_FIELDS: "Vui lòng chọn ngân sách nguồn, đích và số tiền",
    TRANSFER_INVALID_AMOUNT: "Số tiền chuyển phải lớn hơn 0",
    TRANSFER_SAME_BUDGET: "Không thể chuyển ngân sách cho chính nó",
    TRANSFER_INSUFFICIENT: "Ngân sách nguồn không đủ để chuyển",
    TRANSFER_INVALID_ACTION: "Hành động phải là chấp nhận hoặc từ chối",
    TRANSFER_ALREADY_PROCESSED: "Yêu cầu này đã được xử lý",

    CHAT_MESSAGE_REQUIRED: "Vui lòng nhập tin nhắn",
    CHAT_NOT_FOUND: "Không tìm thấy tin nhắn",
    CHAT_INVALID_FEEDBACK: "Phản hồi không hợp lệ",
    CHAT_RATE_LIMITED: "Bạn đang gửi tin nhắn quá nhanh. Vui lòng đợi một chút",

    NOTIFICATION_NOT_FOUND: "Không tìm thấy thông báo",

    SERVER_ERROR: "Đã xảy ra lỗi, vui lòng thử lại sau",

    VERIFICATION_CODE_INVALID: "Mã xác thực không chính xác",
    VERIFICATION_CODE_EXPIRED: "Mã xác thực đã hết hạn",
    VERIFICATION_EMAIL_SENT: "Đã gửi email xác thực",

    ANALYTICS_DATE_REQUIRED: "Vui lòng chọn khoảng thời gian",
    ANALYTICS_INVALID_DATE_RANGE: "Ngày bắt đầu phải trước ngày kết thúc",

    EXPORT_INVALID_FORMAT: "Định dạng xuất không hợp lệ. Chọn csv hoặc xlsx",

    FINANCIAL_SCORE_ERROR: "Không thể tính điểm tài chính",

    OCR_IMAGE_REQUIRED: "Vui lòng tải lên hình ảnh hóa đơn",
    OCR_PROCESSING_FAILED: "Không thể xử lý hình ảnh hóa đơn"
};
