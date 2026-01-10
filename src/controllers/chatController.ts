import { Response } from "express";
import { ChatMessage } from "../models/ChatMessage";
import { AuthRequest } from "../middlewares/authMiddleware";
import { getSpendingData, generateAIResponse } from "../services/aiService";
import { ErrorMessages } from "../utils/errorMessages";
import mongoose from "mongoose";

export const sendMessage = async (req: AuthRequest, res: Response) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== "string") {
            return res.status(400).json({ message: ErrorMessages.CHAT_MESSAGE_REQUIRED });
        }

        const userId = req.user!._id as mongoose.Types.ObjectId;
        const userName = req.user!.name || "bạn";

        const chatCount = await ChatMessage.countDocuments({ userId });
        const isFirstChat = chatCount === 0;

        const recentChats = await ChatMessage.find({ userId })
            .sort({ createdAt: -1 })
            .limit(10);

        const chatHistory = recentChats.reverse().flatMap(chat => [
            { role: "user" as const, content: chat.message },
            ...(chat.response ? [{ role: "model" as const, content: chat.response }] : [])
        ]);

        const spendingData = await getSpendingData(userId);

        const { response, tokenUsage } = await generateAIResponse(message, spendingData, chatHistory, userName, isFirstChat);

        const chatMessage = new ChatMessage({
            userId,
            message,
            response,
            tokenUsage
        });
        await chatMessage.save();

        return res.status(201).json({
            _id: chatMessage._id,
            message: chatMessage.message,
            response: chatMessage.response,
            tokenUsage: chatMessage.tokenUsage,
            createdAt: chatMessage.createdAt
        });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const getChatHistory = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!._id;
        const limit = parseInt(req.query.limit as string) || 20;
        const page = parseInt(req.query.page as string) || 1;

        const chats = await ChatMessage.find({ userId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await ChatMessage.countDocuments({ userId });

        return res.json({
            data: chats.reverse(),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const sendFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { feedback } = req.body;

        if (!feedback || !["like", "dislike"].includes(feedback)) {
            return res.status(400).json({ message: ErrorMessages.CHAT_INVALID_FEEDBACK });
        }

        const chatMessage = await ChatMessage.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(id), userId: req.user!._id },
            { feedback },
            { new: true }
        );

        if (!chatMessage) {
            return res.status(404).json({ message: ErrorMessages.CHAT_NOT_FOUND });
        }

        return res.json(chatMessage);
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};
