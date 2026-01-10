import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
    userId: mongoose.Types.ObjectId;
    name: string;
    parentId?: string;
    keywords: string[];
    createdAt: Date;
    updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
        parentId: { type: Schema.Types.ObjectId, ref: "Category" },
        keywords: [{ type: String }]
    },
    { timestamps: true }
);

export const Category = mongoose.model<ICategory>("Category", categorySchema);
