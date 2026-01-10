import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage extends Document {
    userId: mongoose.Types.ObjectId;
    message: string;
    response?: string;
    tokenUsage?: { prompt: number; completion: number };
    feedback?: "like" | "dislike";
    createdAt: Date;
}

const chatSchema = new Schema<IChatMessage>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        message: { type: String, required: true },
        response: String,
        tokenUsage: { prompt: Number, completion: Number },
        feedback: { type: String, enum: ["like", "dislike"] }
    },
    { timestamps: true }
);

export const ChatMessage = mongoose.model<IChatMessage>("ChatMessage", chatSchema);
