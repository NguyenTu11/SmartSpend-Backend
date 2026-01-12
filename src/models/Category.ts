import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
    userId: mongoose.Types.ObjectId;
    name: string;
    type: "income" | "expense";
    parentId?: string;
    keywords: string[];
    createdAt: Date;
    updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        type: { type: String, enum: ["income", "expense"], default: "expense" },
        parentId: { type: Schema.Types.ObjectId, ref: "Category" },
        keywords: [{ type: String }]
    },
    { timestamps: true }
);

export const Category = mongoose.model<ICategory>("Category", categorySchema);
