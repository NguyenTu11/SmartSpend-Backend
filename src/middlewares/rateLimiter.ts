import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";
import { ErrorMessages } from "../utils/errorMessages";

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 1000;
const CHAT_MAX_REQUESTS = 10;
const OCR_MAX_REQUESTS = 5;

const cleanupExpiredEntries = () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
};

setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

export const chatRateLimiter = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const userId = req.user?._id?.toString();
    if (!userId) {
        return next();
    }

    const key = `chat:${userId}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + WINDOW_MS
        });
        return next();
    }

    if (entry.count >= CHAT_MAX_REQUESTS) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        res.setHeader("Retry-After", retryAfter.toString());
        return res.status(429).json({
            message: ErrorMessages.CHAT_RATE_LIMITED,
            retryAfter
        });
    }

    entry.count++;
    return next();
};

export const ocrRateLimiter = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const userId = req.user?._id?.toString();
    if (!userId) {
        return next();
    }

    const key = `ocr:${userId}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + WINDOW_MS
        });
        return next();
    }

    if (entry.count >= OCR_MAX_REQUESTS) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        res.setHeader("Retry-After", retryAfter.toString());
        return res.status(429).json({
            message: "Quá nhiều yêu cầu quét hóa đơn. Vui lòng thử lại sau.",
            retryAfter
        });
    }

    entry.count++;
    return next();
};
