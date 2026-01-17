import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_CURRENCY_REGEX = /^[A-Z]{3}$/;
const ISO_LANGUAGE_REGEX = /^[a-z]{2}(-[A-Z]{2})?$/;
const DANGEROUS_CHARS_REGEX = /<script|<iframe|javascript:|onerror=|onload=/i;
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export const validators = {
    isValidEmail: (email: string): boolean => {
        if (!email || typeof email !== "string") return false;
        if (email.length > 254) return false;
        if (DANGEROUS_CHARS_REGEX.test(email)) return false;
        return EMAIL_REGEX.test(email.trim().toLowerCase());
    },

    isValidPassword: (password: string): { valid: boolean; error?: string } => {
        if (!password || typeof password !== "string") {
            return { valid: false, error: "Mật khẩu là bắt buộc" };
        }
        if (password.length < 6) {
            return { valid: false, error: "Mật khẩu phải có ít nhất 6 ký tự" };
        }
        if (password.length > 128) {
            return { valid: false, error: "Mật khẩu quá dài (tối đa 128 ký tự)" };
        }
        if (EMOJI_REGEX.test(password)) {
            return { valid: false, error: "Mật khẩu không được chứa emoji" };
        }
        if (!/[a-zA-Z]/.test(password)) {
            return { valid: false, error: "Mật khẩu phải chứa ít nhất một chữ cái" };
        }
        if (!/[0-9]/.test(password)) {
            return { valid: false, error: "Mật khẩu phải chứa ít nhất một chữ số" };
        }
        return { valid: true };
    },

    sanitizeString: (str: string): string => {
        if (!str || typeof str !== "string") return "";
        return str.replace(DANGEROUS_CHARS_REGEX, "").trim();
    },

    isValidName: (name: string): { valid: boolean; error?: string } => {
        if (!name || typeof name !== "string") {
            return { valid: false, error: "Tên là bắt buộc" };
        }
        const trimmed = name.trim();
        if (trimmed.length === 0) {
            return { valid: false, error: "Tên không được để trống" };
        }
        if (trimmed.length > 100) {
            return { valid: false, error: "Tên quá dài (tối đa 100 ký tự)" };
        }
        if (DANGEROUS_CHARS_REGEX.test(trimmed)) {
            return { valid: false, error: "Tên chứa ký tự không hợp lệ" };
        }
        if (EMOJI_REGEX.test(trimmed)) {
            return { valid: false, error: "Tên không được chứa icon/emoji" };
        }
        if (/^[0-9]+$/.test(trimmed)) {
            return { valid: false, error: "Tên không được chỉ chứa số" };
        }
        return { valid: true };
    },

    isValidAmount: (amount: any): { valid: boolean; error?: string } => {
        if (amount === null || amount === undefined) {
            return { valid: false, error: "Số tiền là bắt buộc" };
        }
        const numAmount = Number(amount);
        if (isNaN(numAmount)) {
            return { valid: false, error: "Số tiền phải là một số hợp lệ" };
        }
        if (numAmount < 0) {
            return { valid: false, error: "Số tiền không được âm" };
        }
        if (numAmount === 0) {
            return { valid: false, error: "Số tiền phải lớn hơn 0" };
        }
        if (numAmount > 1000000000000) {
            return { valid: false, error: "Số tiền quá lớn (tối đa 1,000 tỷ)" };
        }
        return { valid: true };
    },

    isValidPositiveNumber: (value: any, allowZero: boolean = false): { valid: boolean; error?: string } => {
        if (value === null || value === undefined) {
            return { valid: false, error: "Giá trị là bắt buộc" };
        }
        const numValue = Number(value);
        if (isNaN(numValue)) {
            return { valid: false, error: "Giá trị phải là một số hợp lệ" };
        }
        if (numValue < 0) {
            return { valid: false, error: "Giá trị không được âm" };
        }
        if (!allowZero && numValue === 0) {
            return { valid: false, error: "Giá trị phải lớn hơn 0" };
        }
        return { valid: true };
    },

    isValidDate: (date: any, allowFuture: boolean = false): { valid: boolean; error?: string } => {
        if (!date) {
            return { valid: false, error: "Ngày là bắt buộc" };
        }
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return { valid: false, error: "Ngày không hợp lệ" };
        }
        if (!allowFuture) {
            const now = new Date();
            now.setHours(23, 59, 59, 999);
            if (parsedDate > now) {
                return { valid: false, error: "Ngày không được ở trong tương lai" };
            }
        }
        return { valid: true };
    },

    isValidText: (text: string, maxLength: number, fieldName: string = "Văn bản"): { valid: boolean; error?: string } => {
        if (!text || typeof text !== "string") {
            return { valid: false, error: `${fieldName} là bắt buộc` };
        }
        const trimmed = text.trim();
        if (trimmed.length === 0) {
            return { valid: false, error: `${fieldName} không được để trống` };
        }
        if (trimmed.length > maxLength) {
            return { valid: false, error: `${fieldName} quá dài (tối đa ${maxLength} ký tự)` };
        }
        if (DANGEROUS_CHARS_REGEX.test(trimmed)) {
            return { valid: false, error: `${fieldName} chứa nội dung không hợp lệ` };
        }
        return { valid: true };
    },

    isValidCategoryName: (name: string): { valid: boolean; error?: string } => {
        if (!name || typeof name !== "string") {
            return { valid: false, error: "Tên danh mục là bắt buộc" };
        }
        const trimmed = name.trim();
        if (trimmed.length === 0) {
            return { valid: false, error: "Tên danh mục không được để trống" };
        }
        if (trimmed.length > 50) {
            return { valid: false, error: "Tên danh mục quá dài (tối đa 50 ký tự)" };
        }
        if (/^[^a-zA-Z0-9\u00C0-\u1EF9\s]+$/.test(trimmed)) {
            return { valid: false, error: "Tên danh mục phải chứa ít nhất một chữ cái hoặc số" };
        }
        if (DANGEROUS_CHARS_REGEX.test(trimmed)) {
            return { valid: false, error: "Tên danh mục chứa ký tự không hợp lệ" };
        }
        return { valid: true };
    },

    isValidCurrency: (currency: string): boolean => {
        if (!currency || typeof currency !== "string") return false;
        return ISO_CURRENCY_REGEX.test(currency);
    },

    isValidLanguage: (language: string): boolean => {
        if (!language || typeof language !== "string") return false;
        return ISO_LANGUAGE_REGEX.test(language);
    },

    isValidImageBase64: (base64: string): { valid: boolean; error?: string } => {
        if (!base64 || typeof base64 !== "string") {
            return { valid: false, error: "Dữ liệu hình ảnh là bắt buộc" };
        }
        const match = base64.match(/^data:image\/(jpeg|jpg|png|webp);base64,/);
        if (!match) {
            return { valid: false, error: "Định dạng hình ảnh không hợp lệ (chỉ chấp nhận JPEG, PNG, WebP)" };
        }
        const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
        const sizeInBytes = (base64Data.length * 3) / 4;
        const maxSize = 10 * 1024 * 1024;
        if (sizeInBytes > maxSize) {
            return { valid: false, error: "Kích thước hình ảnh quá lớn (tối đa 10MB)" };
        }
        return { valid: true };
    },

    isValidFile: (file: any, allowedTypes: string[], maxSizeMB: number): { valid: boolean; error?: string } => {
        if (!file) {
            return { valid: false, error: "File là bắt buộc" };
        }
        const fileType = file.mimetype || "";
        const isTypeValid = allowedTypes.some(type => fileType.includes(type));
        if (!isTypeValid) {
            return { valid: false, error: `Loại file không hợp lệ (chỉ chấp nhận ${allowedTypes.join(", ")})` };
        }
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            return { valid: false, error: `Kích thước file quá lớn (tối đa ${maxSizeMB}MB)` };
        }
        return { valid: true };
    }
};

export const validateRequest = (
    validationFn: (req: AuthRequest) => { valid: boolean; error?: string }
) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        const result = validationFn(req);
        if (!result.valid) {
            res.status(400).json({ message: result.error });
            return;
        }
        next();
    };
};
