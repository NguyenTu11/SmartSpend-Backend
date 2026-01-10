import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
    userId: mongoose.Types.ObjectId;
    type: "budget_warning" | "budget_exceeded" | "budget_transfer_request" | "recurring_transaction" | "info";
    title: string;
    message: string;
    isRead: boolean;
    data?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        type: { type: String, enum: ["budget_warning", "budget_exceeded", "budget_transfer_request", "recurring_transaction", "info"], required: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        isRead: { type: Boolean, default: false },
        data: { type: Schema.Types.Mixed }
    },
    { timestamps: true }
);

export const Notification = mongoose.model<INotification>("Notification", notificationSchema);
