import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
    userId: mongoose.Types.ObjectId;
    walletId: mongoose.Types.ObjectId;
    categoryId: mongoose.Types.ObjectId;
    type: "income" | "expense";
    amount: number;
    currency: string;
    exchangeRate?: number;
    location?: string;
    tags?: string[];
    evidence?: string;
    isRecurring?: boolean;
    recurringFrequency?: "daily" | "weekly" | "monthly";
    lastRecurringDate?: Date;
    nextRecurringDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        walletId: { type: Schema.Types.ObjectId, ref: "Wallet", required: true },
        categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
        type: { type: String, enum: ["income", "expense"], required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: "VND" },
        exchangeRate: Number,
        location: String,
        tags: [String],
        evidence: String,
        isRecurring: { type: Boolean, default: false },
        recurringFrequency: { type: String, enum: ["daily", "weekly", "monthly"] },
        lastRecurringDate: Date,
        nextRecurringDate: Date
    },
    { timestamps: true }
);

export const Transaction = mongoose.model<ITransaction>("Transaction", transactionSchema);
