import mongoose, { Schema, Document } from "mongoose";

export interface IBudgetTransfer extends Document {
    userId: mongoose.Types.ObjectId;
    fromBudgetId: mongoose.Types.ObjectId;
    toBudgetId: mongoose.Types.ObjectId;
    fromCategoryName: string;
    toCategoryName: string;
    amount: number;
    status: "pending" | "approved" | "rejected";
    requestedAt: Date;
    respondedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const budgetTransferSchema = new Schema<IBudgetTransfer>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        fromBudgetId: { type: Schema.Types.ObjectId, ref: "Budget", required: true },
        toBudgetId: { type: Schema.Types.ObjectId, ref: "Budget", required: true },
        fromCategoryName: { type: String, required: true },
        toCategoryName: { type: String, required: true },
        amount: { type: Number, required: true },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
        requestedAt: { type: Date, default: Date.now },
        respondedAt: Date
    },
    { timestamps: true }
);

export const BudgetTransfer = mongoose.model<IBudgetTransfer>("BudgetTransfer", budgetTransferSchema);

