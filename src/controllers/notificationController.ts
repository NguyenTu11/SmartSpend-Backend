import { Response } from "express";
import { Notification } from "../models/Notification";
import { AuthRequest } from "../middlewares/authMiddleware";
import { ErrorMessages } from "../utils/errorMessages";
import { emitNotificationRead, emitUnreadCount } from "../services/notificationService";
import mongoose from "mongoose";

export const getNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const { limit, page, unreadOnly } = req.query;

        const filter: any = { userId: req.user!._id };
        if (unreadOnly === "true") filter.isRead = false;

        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 20;

        const notifications = await Notification.find(filter)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);

        const total = await Notification.countDocuments(filter);
        const unreadCount = await Notification.countDocuments({ userId: req.user!._id, isRead: false });

        return res.json({
            data: notifications,
            unreadCount,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(id), userId: req.user!._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: ErrorMessages.NOTIFICATION_NOT_FOUND });
        }

        const userId = req.user!._id.toString();
        emitNotificationRead(userId, String(id));
        await emitUnreadCount(userId);

        return res.json(notification);
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
    try {
        await Notification.updateMany(
            { userId: req.user!._id, isRead: false },
            { isRead: true }
        );

        return res.json({ message: "Đã đánh dấu tất cả đã đọc" });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findOneAndDelete({
            _id: new mongoose.Types.ObjectId(id),
            userId: req.user!._id
        });

        if (!notification) {
            return res.status(404).json({ message: ErrorMessages.NOTIFICATION_NOT_FOUND });
        }

        return res.json({ message: "Đã xoá thông báo" });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};
