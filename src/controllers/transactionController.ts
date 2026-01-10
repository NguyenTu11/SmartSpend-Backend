import { Response } from "express";
import { Transaction } from "../models/Transaction";
import { Budget } from "../models/Budget";
import { BudgetTransfer } from "../models/BudgetTransfer";
import { Wallet } from "../models/Wallet";
import { Notification } from "../models/Notification";
import { AuthRequest } from "../middlewares/authMiddleware";
import { ErrorMessages } from "../utils/errorMessages";
import mongoose from "mongoose";

const calculateNextRecurringDate = (frequency: string, fromDate: Date = new Date()): Date => {
    const next = new Date(fromDate);
    switch (frequency) {
        case "daily":
            next.setDate(next.getDate() + 1);
            break;
        case "weekly":
            next.setDate(next.getDate() + 7);
            break;
        case "monthly":
            next.setMonth(next.getMonth() + 1);
            break;
    }
    return next;
};

export const createTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const {
            walletId,
            categoryId,
            type,
            amount,
            currency,
            exchangeRate,
            location,
            tags,
            evidence,
            isRecurring,
            recurringFrequency
        } = req.body;

        if (!walletId || !categoryId || !type || !amount) {
            return res.status(400).json({ message: ErrorMessages.TRANSACTION_REQUIRED_FIELDS });
        }

        if (!["income", "expense"].includes(type)) {
            return res.status(400).json({ message: ErrorMessages.TRANSACTION_INVALID_TYPE });
        }

        if (amount <= 0) {
            return res.status(400).json({ message: ErrorMessages.TRANSACTION_INVALID_AMOUNT });
        }

        const wallet = await Wallet.findOne({
            _id: new mongoose.Types.ObjectId(walletId),
            userId: req.user!._id
        });

        if (!wallet) {
            return res.status(404).json({ message: ErrorMessages.WALLET_NOT_FOUND });
        }

        const transaction = new Transaction({
            userId: req.user!._id,
            walletId: new mongoose.Types.ObjectId(walletId),
            categoryId: new mongoose.Types.ObjectId(categoryId),
            type,
            amount,
            currency: currency || "VND",
            exchangeRate,
            location,
            tags: tags || [],
            evidence,
            isRecurring: !!isRecurring,
            recurringFrequency: isRecurring ? recurringFrequency : undefined,
            nextRecurringDate: isRecurring && recurringFrequency
                ? calculateNextRecurringDate(recurringFrequency)
                : undefined
        });

        await transaction.save();

        const balanceChange = type === "income" ? amount : -amount;
        await Wallet.findByIdAndUpdate(walletId, { $inc: { balance: balanceChange } });

        const budgets = await Budget.find({
            userId: req.user!._id,
            categoryId: transaction.categoryId,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        }).populate("categoryId", "name");

        for (const budget of budgets) {
            const budgetCategoryId = (budget.categoryId as any)?._id || budget.categoryId;

            const totalSpent = await Transaction.aggregate([
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

            const spent = totalSpent[0]?.total || 0;
            const categoryName = (budget.categoryId as any)?.name || "Unknown";

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const existingNotification = await Notification.findOne({
                userId: req.user!._id,
                "data.budgetId": budget._id,
                createdAt: { $gte: today }
            });

            if (existingNotification) continue;

            if (spent >= budget.limit) {
                const deficit = spent - budget.limit;

                const availableBudgets = await Budget.find({
                    userId: req.user!._id,
                    _id: { $ne: budget._id },
                    startDate: { $lte: new Date() },
                    endDate: { $gte: new Date() }
                }).populate("categoryId", "name");

                let suggestedFromBudget = null;
                for (const fromBudget of availableBudgets) {
                    const fromCategoryId = (fromBudget.categoryId as any)?._id || fromBudget.categoryId;
                    const fromSpent = await Transaction.aggregate([
                        {
                            $match: {
                                userId: new mongoose.Types.ObjectId(req.user!._id as string),
                                categoryId: new mongoose.Types.ObjectId(fromCategoryId),
                                type: "expense",
                                createdAt: { $gte: fromBudget.startDate, $lte: fromBudget.endDate }
                            }
                        },
                        { $group: { _id: null, total: { $sum: "$amount" } } }
                    ]);
                    const fromSpentTotal = fromSpent[0]?.total || 0;
                    const fromRemaining = fromBudget.limit - fromSpentTotal;

                    if (fromRemaining >= deficit) {
                        suggestedFromBudget = fromBudget;
                        break;
                    }
                }

                if (suggestedFromBudget) {
                    const fromCategoryName = (suggestedFromBudget.categoryId as any)?.name || "Unknown";

                    const transfer = new BudgetTransfer({
                        userId: req.user!._id,
                        fromBudgetId: suggestedFromBudget._id,
                        toBudgetId: budget._id,
                        fromCategoryName,
                        toCategoryName: categoryName,
                        amount: deficit,
                        status: "pending",
                        requestedAt: new Date()
                    });
                    await transfer.save();

                    await Notification.create({
                        userId: req.user!._id,
                        type: "budget_transfer_request",
                        title: "Gợi ý chuyển ngân sách",
                        message: `${categoryName} đã vượt ${deficit.toLocaleString("vi-VN")} VND. Chuyển từ ${fromCategoryName}?`,
                        isRead: false,
                        data: {
                            transferId: transfer._id,
                            fromBudgetId: suggestedFromBudget._id,
                            toBudgetId: budget._id,
                            fromCategoryName,
                            toCategoryName: categoryName,
                            suggestedAmount: deficit,
                            deficit
                        }
                    });
                } else {
                    await Notification.create({
                        userId: req.user!._id,
                        type: "budget_exceeded",
                        title: "Vượt ngân sách",
                        message: `Bạn đã vượt ngân sách ${categoryName}. Chi tiêu: ${spent.toLocaleString("vi-VN")} VND / Hạn mức: ${budget.limit.toLocaleString("vi-VN")} VND`,
                        isRead: false,
                        data: {
                            budgetId: budget._id,
                            categoryId: budgetCategoryId,
                            spent,
                            limit: budget.limit,
                            deficit
                        }
                    });
                }
            } else if (spent >= budget.limit * budget.alertThreshold) {
                await Notification.create({
                    userId: req.user!._id,
                    type: "budget_warning",
                    title: "Cảnh báo ngân sách",
                    message: `Bạn sắp hết ngân sách ${categoryName}. Chi tiêu: ${spent.toLocaleString("vi-VN")} VND / Hạn mức: ${budget.limit.toLocaleString("vi-VN")} VND`,
                    isRead: false,
                    data: {
                        budgetId: budget._id,
                        categoryId: budgetCategoryId,
                        spent,
                        limit: budget.limit
                    }
                });
            }
        }

        return res.status(201).json(transaction);
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const { walletId, categoryId, type, startDate, endDate, limit, page } = req.query;

        const filter: any = { userId: req.user!._id };

        if (walletId) filter.walletId = new mongoose.Types.ObjectId(walletId as string);
        if (categoryId) filter.categoryId = new mongoose.Types.ObjectId(categoryId as string);
        if (type) filter.type = type;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate as string);
            if (endDate) filter.createdAt.$lte = new Date(endDate as string);
        }

        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 20;

        const transactions = await Transaction.find(filter)
            .populate("categoryId", "name")
            .populate("walletId", "name")
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);

        const total = await Transaction.countDocuments(filter);

        return res.json({
            data: transactions,
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

export const getExpenseSummary = async (req: AuthRequest, res: Response) => {
    try {
        const { month, year } = req.query;

        const now = new Date();
        const targetMonth = month ? parseInt(month as string) - 1 : now.getMonth();
        const targetYear = year ? parseInt(year as string) : now.getFullYear();

        const startOfMonth = new Date(targetYear, targetMonth, 1);
        const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

        const prevStartOfMonth = new Date(targetYear, targetMonth - 1, 1);
        const prevEndOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59);

        const currentMonthTx = await Transaction.find({
            userId: req.user!._id,
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }).populate("categoryId", "name").populate("walletId", "name");

        const prevMonthTx = await Transaction.find({
            userId: req.user!._id,
            createdAt: { $gte: prevStartOfMonth, $lte: prevEndOfMonth }
        }).populate("categoryId", "name");

        let totalIncome = 0;
        let totalExpense = 0;
        const categoryBreakdown: Record<string, { name: string; amount: number; count: number }> = {};
        const walletBreakdown: Record<string, { name: string; income: number; expense: number }> = {};

        for (const tx of currentMonthTx) {
            const catName = (tx.categoryId as any)?.name || "Khác";
            const catId = ((tx.categoryId as any)?._id || tx.categoryId).toString();
            const walletName = (tx.walletId as any)?.name || "Unknown";
            const walletIdStr = ((tx.walletId as any)?._id || tx.walletId).toString();

            if (tx.type === "income") {
                totalIncome += tx.amount;
                if (!walletBreakdown[walletIdStr]) {
                    walletBreakdown[walletIdStr] = { name: walletName, income: 0, expense: 0 };
                }
                walletBreakdown[walletIdStr].income += tx.amount;
            } else {
                totalExpense += tx.amount;
                if (!categoryBreakdown[catId]) {
                    categoryBreakdown[catId] = { name: catName, amount: 0, count: 0 };
                }
                categoryBreakdown[catId].amount += tx.amount;
                categoryBreakdown[catId].count += 1;
                if (!walletBreakdown[walletIdStr]) {
                    walletBreakdown[walletIdStr] = { name: walletName, income: 0, expense: 0 };
                }
                walletBreakdown[walletIdStr].expense += tx.amount;
            }
        }

        let prevTotalIncome = 0;
        let prevTotalExpense = 0;
        for (const tx of prevMonthTx) {
            if (tx.type === "income") {
                prevTotalIncome += tx.amount;
            } else {
                prevTotalExpense += tx.amount;
            }
        }

        const incomeChange = prevTotalIncome > 0
            ? Math.round(((totalIncome - prevTotalIncome) / prevTotalIncome) * 100)
            : 0;
        const expenseChange = prevTotalExpense > 0
            ? Math.round(((totalExpense - prevTotalExpense) / prevTotalExpense) * 100)
            : 0;

        const categoryList = Object.values(categoryBreakdown)
            .sort((a, b) => b.amount - a.amount)
            .map(c => ({
                name: c.name,
                amount: c.amount,
                count: c.count,
                percentage: totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0
            }));

        const walletList = Object.values(walletBreakdown).map(w => ({
            name: w.name,
            income: w.income,
            expense: w.expense,
            net: w.income - w.expense
        }));

        return res.json({
            period: {
                month: targetMonth + 1,
                year: targetYear
            },
            summary: {
                totalIncome,
                totalExpense,
                netSavings: totalIncome - totalExpense,
                transactionCount: currentMonthTx.length
            },
            comparison: {
                incomeChange,
                expenseChange,
                prevTotalIncome,
                prevTotalExpense
            },
            categoryBreakdown: categoryList,
            walletBreakdown: walletList
        });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const updateTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!id) return res.status(400).json({ message: ErrorMessages.TRANSACTION_ID_REQUIRED });

        const oldTransaction = await Transaction.findOne({
            _id: new mongoose.Types.ObjectId(id),
            userId: req.user!._id
        });

        if (!oldTransaction) return res.status(404).json({ message: ErrorMessages.TRANSACTION_NOT_FOUND });

        if (updates.walletId) updates.walletId = new mongoose.Types.ObjectId(updates.walletId);
        if (updates.categoryId) updates.categoryId = new mongoose.Types.ObjectId(updates.categoryId);

        const oldBalanceEffect = oldTransaction.type === "income" ? oldTransaction.amount : -oldTransaction.amount;
        await Wallet.findByIdAndUpdate(oldTransaction.walletId, { $inc: { balance: -oldBalanceEffect } });

        const newType = updates.type || oldTransaction.type;
        const newAmount = updates.amount || oldTransaction.amount;
        const newWalletId = updates.walletId || oldTransaction.walletId;

        const newBalanceEffect = newType === "income" ? newAmount : -newAmount;
        await Wallet.findByIdAndUpdate(newWalletId, { $inc: { balance: newBalanceEffect } });

        const transaction = await Transaction.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(id), userId: req.user!._id },
            updates,
            { new: true }
        );

        return res.json(transaction);
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const deleteTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: ErrorMessages.TRANSACTION_ID_REQUIRED });

        const transaction = await Transaction.findOne({
            _id: new mongoose.Types.ObjectId(id),
            userId: req.user!._id
        });

        if (!transaction) return res.status(404).json({ message: ErrorMessages.TRANSACTION_NOT_FOUND });

        const balanceEffect = transaction.type === "income" ? transaction.amount : -transaction.amount;
        await Wallet.findByIdAndUpdate(transaction.walletId, { $inc: { balance: -balanceEffect } });

        await Transaction.findByIdAndDelete(id);

        return res.json({ message: "Đã xoá giao dịch thành công" });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};
