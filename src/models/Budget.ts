import mongoose, { Schema, Document } from "mongoose";

export interface IBudget extends Document {
    userId: mongoose.Types.ObjectId;
    categoryId: mongoose.Types.ObjectId;
    limit: number;
    alertThreshold: number;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

const budgetSchema = new Schema<IBudget>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
        limit: { type: Number, required: true },
        alertThreshold: { type: Number, default: 0.8 },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
    },
    { timestamps: true }
);

export const Budget = mongoose.model<IBudget>("Budget", budgetSchema);
