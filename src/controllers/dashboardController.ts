import { Response } from "express";
import { Transaction } from "../models/Transaction";
import { Budget } from "../models/Budget";
import { Wallet } from "../models/Wallet";
import { AuthRequest } from "../middlewares/authMiddleware";
import { ErrorMessages } from "../utils/errorMessages";
import mongoose from "mongoose";

export const getDashboardInsights = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ message: ErrorMessages.NO_TOKEN });
        }
        const userId = String(req.user._id);
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const now = new Date();

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const prevStartOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevEndOfMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const [monthlyTx, todayTx, prevMonthTx, budgets, wallets] = await Promise.all([
            Transaction.find({
                userId,
                createdAt: { $gte: startOfMonth, $lte: endOfMonth }
            }).populate("categoryId", "name"),
            Transaction.find({
                userId,
                createdAt: { $gte: startOfToday, $lte: endOfToday }
            }).populate("categoryId", "name"),
            Transaction.find({
                userId,
                createdAt: { $gte: prevStartOfMonth, $lte: prevEndOfMonth }
            }),
            Budget.find({
                userId: userObjectId,
                startDate: { $lte: now },
                endDate: { $gte: now }
            }).populate("categoryId", "name"),
            Wallet.find({ userId: userObjectId })
        ]);

        let totalExpenseThisMonth = 0;
        let totalIncomeThisMonth = 0;
        let todayExpense = 0;
        let prevTotalExpense = 0;
        const categoryTotals: Record<string, { name: string; amount: number }> = {};
        const dailyExpenses: Record<string, number> = {};

        for (const tx of monthlyTx) {
            const dateKey = tx.createdAt?.toISOString().split("T")[0] || "";
            if (tx.type === "expense") {
                totalExpenseThisMonth += tx.amount;
                if (dateKey) dailyExpenses[dateKey] = (dailyExpenses[dateKey] || 0) + tx.amount;

                const catName = (tx.categoryId as any)?.name || "Khác";
                const catId = String((tx.categoryId as any)?._id || tx.categoryId);
                if (!categoryTotals[catId]) {
                    categoryTotals[catId] = { name: catName, amount: 0 };
                }
                categoryTotals[catId].amount += tx.amount;
            } else {
                totalIncomeThisMonth += tx.amount;
            }
        }

        for (const tx of todayTx) {
            if (tx.type === "expense") {
                todayExpense += tx.amount;
            }
        }

        for (const tx of prevMonthTx) {
            if (tx.type === "expense") {
                prevTotalExpense += tx.amount;
            }
        }

        const currentDay = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const avgDailyExpense = currentDay > 0 ? totalExpenseThisMonth / currentDay : 0;
        const predictedMonthEnd = Math.round(avgDailyExpense * daysInMonth);

        const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
        let totalBudgetSpent = 0;
        const budgetWarnings: { category: string; percentage: number; status: string; spent: number; limit: number }[] = [];

        for (const budget of budgets) {
            const budgetCategoryId = (budget.categoryId as any)?._id || budget.categoryId;
            const categoryName = (budget.categoryId as any)?.name || "Unknown";

            const spentResult = await Transaction.aggregate([
                {
                    $match: {
                        userId: userObjectId,
                        categoryId: new mongoose.Types.ObjectId(budgetCategoryId),
                        type: "expense",
                        createdAt: { $gte: budget.startDate, $lte: budget.endDate }
                    }
                },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]);

            const spent = spentResult[0]?.total || 0;
            totalBudgetSpent += spent;
            const percentage = Math.round((spent / budget.limit) * 100);

            if (percentage >= 80) {
                budgetWarnings.push({
                    category: categoryName,
                    percentage,
                    status: percentage > 100 ? "EXCEEDED" : "WARNING",
                    spent,
                    limit: budget.limit
                });
            }
        }

        const budgetRemaining = totalBudgetLimit - totalBudgetSpent;
        const budgetPercentage = totalBudgetLimit > 0 ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100) : 0;

        const expenseChange = prevTotalExpense > 0
            ? Math.round(((totalExpenseThisMonth - prevTotalExpense) / prevTotalExpense) * 100)
            : 0;

        const aiInsights: string[] = [];

        if (predictedMonthEnd > totalBudgetLimit && totalBudgetLimit > 0) {
            const overAmount = predictedMonthEnd - totalBudgetLimit;
            aiInsights.push(`Theo tốc độ hiện tại, bạn sẽ vượt ngân sách ${Math.round((overAmount / totalBudgetLimit) * 100)}% cuối tháng`);
        }

        const topCategories = Object.values(categoryTotals)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 3);

        if (topCategories.length > 0 && totalExpenseThisMonth > 0) {
            const topCategory = topCategories[0];
            if (topCategory) {
                const topPercent = Math.round((topCategory.amount / totalExpenseThisMonth) * 100);
                if (topPercent > 40) {
                    aiInsights.push(`${topCategory.name} chiếm ${topPercent}% chi tiêu - nên cân nhắc giảm`);
                }
            }
        }

        if (expenseChange > 20) {
            aiInsights.push(`Chi tiêu tăng ${expenseChange}% so với tháng trước`);
        } else if (expenseChange < -10) {
            aiInsights.push(`Tuyệt vời! Chi tiêu giảm ${Math.abs(expenseChange)}% so với tháng trước`);
        }

        const dailyData: { date: string; amount: number }[] = [];
        for (let d = 1; d <= currentDay; d++) {
            const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            dailyData.push({
                date: dateStr,
                amount: dailyExpenses[dateStr] || 0
            });
        }

        const categoryBreakdown = Object.values(categoryTotals)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 6)
            .map(c => ({
                name: c.name,
                amount: c.amount,
                percentage: totalExpenseThisMonth > 0 ? Math.round((c.amount / totalExpenseThisMonth) * 100) : 0
            }));

        const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

        return res.json({
            heroStats: {
                totalExpenseThisMonth,
                expenseChange,
                budgetRemaining,
                budgetPercentage,
                todayExpense,
                predictedMonthEnd,
                totalBalance
            },
            charts: {
                dailyExpenses: dailyData,
                categoryBreakdown
            },
            warnings: budgetWarnings,
            aiInsights,
            recentTransactions: monthlyTx
                .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
                .slice(0, 5)
                .map(tx => ({
                    _id: tx._id,
                    type: tx.type,
                    amount: tx.amount,
                    category: (tx.categoryId as any)?.name || "Khác",
                    createdAt: tx.createdAt
                }))
        });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};
