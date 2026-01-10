import mongoose, { Schema, Document } from "mongoose";

export interface IWallet extends Document {
    userId: mongoose.Types.ObjectId;
    name: string;
    type: "cash" | "bank" | "credit" | "saving";
    currency: string;
    balance: number;
    isExcludedFromTotal: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const walletSchema = new Schema<IWallet>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        type: { type: String, enum: ["cash", "bank", "credit", "saving"], default: "cash" },
        currency: { type: String, default: "VND" },
        balance: { type: Number, default: 0 },
        isExcludedFromTotal: { type: Boolean, default: false }
    },
    { timestamps: true }
);

export const Wallet = mongoose.model<IWallet>("Wallet", walletSchema);
