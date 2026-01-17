import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { Budget } from "../models/Budget";
import { Category } from "../models/Category";
import { Transaction } from "../models/Transaction";
import { ErrorMessages } from "../utils/errorMessages";
import { validators } from "../middlewares/validationMiddleware";
import mongoose from "mongoose";

export const createBudget = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        const { categoryId, limit, alertThreshold, startDate, endDate } = req.body;

        if (!req.user?._id) return res.status(401).json({ message: ErrorMessages.NO_TOKEN });
        if (!categoryId || !limit || !startDate || !endDate) {
            return res.status(400).json({ message: ErrorMessages.BUDGET_REQUIRED_FIELDS });
        }

        const amountValidation = validators.isValidAmount(limit);
        if (!amountValidation.valid) {
            return res.status(400).json({ message: amountValidation.error });
        }

        if (Number(limit) > 1000000000000) {
            return res.status(400).json({ message: ErrorMessages.AMOUNT_TOO_LARGE });
        }

        const category = await Category.findOne({
            _id: new mongoose.Types.ObjectId(categoryId),
            userId: req.user._id
        });
        if (!category) {
            return res.status(404).json({ message: ErrorMessages.CATEGORY_NOT_FOUND });
        }

        const existingBudget = await Budget.findOne({
            userId: req.user._id,
            categoryId: new mongoose.Types.ObjectId(categoryId)
        });
        if (existingBudget) {
            return res.status(400).json({ message: ErrorMessages.BUDGET_DUPLICATE });
        }

        const startDateValidation = validators.isValidDate(startDate, true);
        if (!startDateValidation.valid) {
            return res.status(400).json({ message: startDateValidation.error });
        }

        const endDateValidation = validators.isValidDate(endDate, true);
        if (!endDateValidation.valid) {
            return res.status(400).json({ message: endDateValidation.error });
        }

        if (new Date(startDate) >= new Date(endDate)) {
            return res.status(400).json({ message: ErrorMessages.ANALYTICS_INVALID_DATE_RANGE });
        }

        if (alertThreshold !== undefined && (alertThreshold < 0 || alertThreshold > 1)) {
            return res.status(400).json({ message: "Ngưỡng cảnh báo phải nằm trong khoảng 0-1" });
        }

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
        const { limit, alertThreshold, startDate, endDate } = req.body;

        if (!id) return res.status(400).json({ message: ErrorMessages.REQUIRED_FIELDS });
        if (!req.user?._id) return res.status(401).json({ message: ErrorMessages.NO_TOKEN });

        const existingBudget = await Budget.findOne({
            _id: new mongoose.Types.ObjectId(id),
            userId: req.user._id
        });

        if (!existingBudget) {
            return res.status(404).json({ message: ErrorMessages.BUDGET_NOT_FOUND });
        }

        const updates: any = {};

        if (limit !== undefined) {
            const amountValidation = validators.isValidAmount(limit);
            if (!amountValidation.valid) {
                return res.status(400).json({ message: amountValidation.error });
            }

            if (Number(limit) > 1000000000000) {
                return res.status(400).json({ message: ErrorMessages.AMOUNT_TOO_LARGE });
            }

            const spentResult = await Transaction.aggregate([
                {
                    $match: {
                        userId: new mongoose.Types.ObjectId(req.user._id),
                        categoryId: existingBudget.categoryId,
                        type: "expense",
                        createdAt: { $gte: existingBudget.startDate, $lte: existingBudget.endDate }
                    }
                },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]);

            const currentSpending = spentResult[0]?.total || 0;
            if (Number(limit) < currentSpending) {
                return res.status(400).json({ message: ErrorMessages.BUDGET_LIMIT_BELOW_SPENDING });
            }

            updates.limit = limit;
        }

        if (alertThreshold !== undefined) {
            if (alertThreshold < 0 || alertThreshold > 1) {
                return res.status(400).json({ message: "Ngưỡng cảnh báo phải nằm trong khoảng 0-1" });
            }
            updates.alertThreshold = alertThreshold;
        }

        if (startDate !== undefined) {
            const startDateValidation = validators.isValidDate(startDate, true);
            if (!startDateValidation.valid) {
                return res.status(400).json({ message: startDateValidation.error });
            }
            updates.startDate = startDate;
        }

        if (endDate !== undefined) {
            const endDateValidation = validators.isValidDate(endDate, true);
            if (!endDateValidation.valid) {
                return res.status(400).json({ message: endDateValidation.error });
            }
            updates.endDate = endDate;
        }

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

export const getBudgetStatus = async (req: AuthRequest, res: Response): Promise<Response> => {
    try {
        if (!req.user?._id) return res.status(401).json({ message: ErrorMessages.NO_TOKEN });

        const now = new Date();
        const budgets = await Budget.find({
            userId: new mongoose.Types.ObjectId(req.user._id),
            startDate: { $lte: now },
            endDate: { $gte: now }
        }).populate("categoryId", "name");

        const { Transaction } = await import("../models/Transaction");

        const budgetStatuses = await Promise.all(budgets.map(async (budget) => {
            const budgetCategoryId = (budget.categoryId as any)?._id || budget.categoryId;
            const categoryName = (budget.categoryId as any)?.name || "Unknown";

            const spentResult = await Transaction.aggregate([
                {
                    $match: {
                        userId: new mongoose.Types.ObjectId(req.user!._id as string),
                        categoryId: new mongoose.Types.ObjectId(budgetCategoryId),
                        type: "expense",
                        createdAt: { $gte: budget.startDate, $lte: budget.endDate }
                    }
                },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]);

            const spent = spentResult[0]?.total || 0;
            const remaining = budget.limit - spent;
            const percentage = Math.round((spent / budget.limit) * 100);

            let status: "SAFE" | "WARNING" | "EXCEEDED";
            if (percentage > 100) {
                status = "EXCEEDED";
            } else if (percentage >= budget.alertThreshold * 100) {
                status = "WARNING";
            } else {
                status = "SAFE";
            }

            return {
                budgetId: budget._id,
                categoryId: budgetCategoryId,
                categoryName,
                limit: budget.limit,
                spent,
                remaining,
                percentage,
                status,
                alertThreshold: budget.alertThreshold,
                startDate: budget.startDate,
                endDate: budget.endDate
            };
        }));

        const summary = {
            total: budgetStatuses.length,
            safe: budgetStatuses.filter(b => b.status === "SAFE").length,
            warning: budgetStatuses.filter(b => b.status === "WARNING").length,
            exceeded: budgetStatuses.filter(b => b.status === "EXCEEDED").length
        };

        return res.json({ summary, budgets: budgetStatuses });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};
