import mongoose from "mongoose";
import { Notification, INotification } from "../models/Notification";
import { socketManager } from "./socketManager";

interface CreateNotificationInput {
    userId: mongoose.Types.ObjectId | string;
    type: INotification["type"];
    title: string;
    message: string;
    data?: Record<string, any>;
}

export const createNotification = async (input: CreateNotificationInput) => {
    const notification = new Notification({
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        isRead: false,
        data: input.data
    });
    await notification.save();

    socketManager.emitToUser(input.userId.toString(), "notification", {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: notification.createdAt
    });

    return notification;
};

export const emitNotificationRead = (userId: string, notificationId: string) => {
    socketManager.emitToUser(userId, "notification:read", { notificationId });
};

export const emitUnreadCount = async (userId: string) => {
    const count = await Notification.countDocuments({ userId, isRead: false });
    socketManager.emitToUser(userId, "notification:unread_count", { count });
};

