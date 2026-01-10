import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { Budget } from "../models/Budget";
import { ErrorMessages } from "../utils/errorMessages";
import mongoose from "mongoose";

export const createBudget = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { categoryId, limit, alertThreshold, startDate, endDate } = req.body;

        if (!req.user?._id) return res.status(401).json({ message: ErrorMessages.NO_TOKEN });
        if (!categoryId || !limit || !startDate || !endDate)
            return res.status(400).json({ message: ErrorMessages.BUDGET_REQUIRED_FIELDS });

        if (limit <= 0)
            return res.status(400).json({ message: ErrorMessages.BUDGET_INVALID_LIMIT });

        const budget = new Budget({
            userId: new mongoose.Types.ObjectId(req.user._id),
            categoryId: new mongoose.Types.ObjectId(categoryId),
            limit,
            alertThreshold: alertThreshold ?? 0.8,
            startDate,
            endDate,
        });

        await budget.save();
        return res.status(201).json(budget);
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const getBudgets = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        if (!req.user?._id) return res.status(401).json({ message: ErrorMessages.NO_TOKEN });

        const budgets = await Budget.find({ userId: req.user._id }).populate("categoryId", "name");
        return res.json(budgets);
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const updateBudget = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: ErrorMessages.REQUIRED_FIELDS });
        if (!req.user?._id) return res.status(401).json({ message: ErrorMessages.NO_TOKEN });

        const updates = req.body;

        const budget = await Budget.findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(id),
                userId: new mongoose.Types.ObjectId(req.user._id),
            },
            updates,
            { new: true }
        );

        if (!budget) return res.status(404).json({ message: ErrorMessages.BUDGET_NOT_FOUND });
        return res.json(budget);
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const deleteBudget = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: ErrorMessages.REQUIRED_FIELDS });
        if (!req.user?._id) return res.status(401).json({ message: ErrorMessages.NO_TOKEN });

        const budget = await Budget.findOneAndDelete({
            _id: new mongoose.Types.ObjectId(id),
            userId: new mongoose.Types.ObjectId(req.user._id),
        });

        if (!budget) return res.status(404).json({ message: ErrorMessages.BUDGET_NOT_FOUND });
        return res.json({ message: "Đã xoá ngân sách thành công" });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};
