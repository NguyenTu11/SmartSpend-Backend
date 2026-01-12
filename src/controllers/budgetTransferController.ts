import { Response } from "express";
import { BudgetTransfer } from "../models/BudgetTransfer";
import { Budget } from "../models/Budget";
import { AuthRequest } from "../middlewares/authMiddleware";
import { ErrorMessages } from "../utils/errorMessages";
import { createNotification } from "../services/notificationService";
import mongoose from "mongoose";

export const createTransferRequest = async (req: AuthRequest, res: Response) => {
    try {
        const { fromBudgetId, toBudgetId, amount } = req.body;

        if (!fromBudgetId || !toBudgetId || !amount) {
            return res.status(400).json({ message: ErrorMessages.TRANSFER_REQUIRED_FIELDS });
        }

        if (amount <= 0) {
            return res.status(400).json({ message: ErrorMessages.TRANSFER_INVALID_AMOUNT });
        }

        if (fromBudgetId === toBudgetId) {
            return res.status(400).json({ message: ErrorMessages.TRANSFER_SAME_BUDGET });
        }

        const fromBudget = await Budget.findOne({
            _id: new mongoose.Types.ObjectId(fromBudgetId),
            userId: req.user!._id
        }).populate("categoryId", "name");

        const toBudget = await Budget.findOne({
            _id: new mongoose.Types.ObjectId(toBudgetId),
            userId: req.user!._id
        }).populate("categoryId", "name");

        if (!fromBudget || !toBudget) {
            return res.status(404).json({ message: ErrorMessages.BUDGET_NOT_FOUND });
        }

        if (fromBudget.limit < amount) {
            return res.status(400).json({ message: ErrorMessages.TRANSFER_INSUFFICIENT });
        }

        const fromCategoryName = (fromBudget.categoryId as any)?.name || "Unknown";
        const toCategoryName = (toBudget.categoryId as any)?.name || "Unknown";

        const transfer = new BudgetTransfer({
            userId: req.user!._id,
            fromBudgetId: new mongoose.Types.ObjectId(fromBudgetId),
            toBudgetId: new mongoose.Types.ObjectId(toBudgetId),
            fromCategoryName,
            toCategoryName,
            amount,
            status: "pending",
            requestedAt: new Date()
        });

        await transfer.save();

        await createNotification({
            userId: req.user!._id,
            type: "budget_transfer_request",
            title: "Yêu cầu chuyển ngân sách",
            message: `Chuyển ${amount.toLocaleString("vi-VN")} VND từ ${fromCategoryName} sang ${toCategoryName}?`,
            data: {
                transferId: transfer._id,
                fromBudgetId,
                toBudgetId,
                fromCategoryName,
                toCategoryName,
                amount
            }
        });

        return res.status(201).json({
            ...transfer.toObject(),
            fromCategoryName,
            toCategoryName
        });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const respondToTransfer = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { action } = req.body;

        if (!["approve", "reject"].includes(action)) {
            return res.status(400).json({ message: ErrorMessages.TRANSFER_INVALID_ACTION });
        }

        const transfer = await BudgetTransfer.findOne({
            _id: new mongoose.Types.ObjectId(id),
            userId: req.user!._id,
            status: "pending"
        });

        if (!transfer) {
            return res.status(404).json({ message: ErrorMessages.TRANSFER_ALREADY_PROCESSED });
        }

        if (action === "approve") {
            const fromBudget = await Budget.findById(transfer.fromBudgetId);
            const toBudget = await Budget.findById(transfer.toBudgetId);

            if (!fromBudget || !toBudget) {
                return res.status(404).json({ message: ErrorMessages.BUDGET_NOT_FOUND });
            }

            if (fromBudget.limit < transfer.amount) {
                return res.status(400).json({ message: ErrorMessages.TRANSFER_INSUFFICIENT });
            }

            await Budget.findByIdAndUpdate(transfer.fromBudgetId, {
                $inc: { limit: -transfer.amount }
            });

            await Budget.findByIdAndUpdate(transfer.toBudgetId, {
                $inc: { limit: transfer.amount }
            });

            transfer.status = "approved";
        } else {
            transfer.status = "rejected";
        }

        transfer.respondedAt = new Date();
        await transfer.save();

        const statusMessage = action === "approve" ? "Đã chấp nhận chuyển ngân sách" : "Đã từ chối chuyển ngân sách";

        return res.json({
            message: statusMessage,
            transfer
        });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const getTransferHistory = async (req: AuthRequest, res: Response) => {
    try {
        const { status, limit, page } = req.query;

        const filter: any = { userId: req.user!._id };
        if (status) filter.status = status;

        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 20;

        const transfers = await BudgetTransfer.find(filter)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);

        const total = await BudgetTransfer.countDocuments(filter);

        const formattedTransfers = transfers.map(t => ({
            _id: t._id,
            fromCategoryName: t.fromCategoryName,
            toCategoryName: t.toCategoryName,
            amount: t.amount,
            status: t.status,
            requestedAt: t.requestedAt,
            respondedAt: t.respondedAt,
            createdAt: t.createdAt
        }));

        return res.json({
            data: formattedTransfers,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const getPendingTransfers = async (req: AuthRequest, res: Response) => {
    try {
        const transfers = await BudgetTransfer.find({
            userId: req.user!._id,
            status: "pending"
        }).sort({ createdAt: -1 });

        const formattedTransfers = transfers.map(t => ({
            _id: t._id,
            fromCategoryName: t.fromCategoryName,
            toCategoryName: t.toCategoryName,
            amount: t.amount,
            status: t.status,
            requestedAt: t.requestedAt,
            createdAt: t.createdAt
        }));

        return res.json(formattedTransfers);
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};
