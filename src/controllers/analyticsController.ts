import { Response } from "express";
import { Transaction } from "../models/Transaction";
import { AuthRequest } from "../middlewares/authMiddleware";
import { ErrorMessages } from "../utils/errorMessages";

type TimelineItem = { date: string; income: number; expense: number } |
{ week: string; income: number; expense: number } |
{ month: string; income: number; expense: number };

export const getAnalyticsByTime = async (req: AuthRequest, res: Response) => {
    try {
        const { from, to, groupBy } = req.query;

        if (!from || !to) {
            return res.status(400).json({ message: ErrorMessages.ANALYTICS_DATE_REQUIRED });
        }

        const startDate = new Date(from as string);
        const endDate = new Date(to as string);
        endDate.setHours(23, 59, 59, 999);

        if (startDate > endDate) {
            return res.status(400).json({ message: ErrorMessages.ANALYTICS_INVALID_DATE_RANGE });
        }

        const userId = req.user!._id;
        const transactions = await Transaction.find({
            userId,
            createdAt: { $gte: startDate, $lte: endDate }
        }).populate("categoryId", "name").sort({ createdAt: 1 });

        let totalIncome = 0;
        let totalExpense = 0;
        const dailyData: Record<string, { date: string; income: number; expense: number }> = {};
        const categoryTotals: Record<string, { name: string; amount: number }> = {};

        for (const tx of transactions) {
            const dateParts = tx.createdAt.toISOString().split("T");
            const dateKey = dateParts[0] || new Date().toISOString().split("T")[0] || "unknown";
            const catName = (tx.categoryId as any)?.name || "Khác";
            const catId = String((tx.categoryId as any)?._id || tx.categoryId);

            if (!dailyData[dateKey]) {
                dailyData[dateKey] = { date: dateKey, income: 0, expense: 0 };
            }

            if (tx.type === "income") {
                totalIncome += tx.amount;
                dailyData[dateKey].income += tx.amount;
            } else {
                totalExpense += tx.amount;
                dailyData[dateKey].expense += tx.amount;

                if (!categoryTotals[catId]) {
                    categoryTotals[catId] = { name: catName, amount: 0 };
                }
                categoryTotals[catId].amount += tx.amount;
            }
        }

        const timeline = Object.values(dailyData).sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        let groupedTimeline: TimelineItem[] = timeline;
        if (groupBy === "week") {
            groupedTimeline = groupByWeek(timeline);
        } else if (groupBy === "month") {
            groupedTimeline = groupByMonth(timeline);
        }

        const categoryBreakdown = Object.values(categoryTotals)
            .sort((a, b) => b.amount - a.amount)
            .map(c => ({
                name: c.name,
                amount: c.amount,
                percentage: totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0
            }));

        return res.json({
            period: { from: startDate, to: endDate },
            summary: {
                totalIncome,
                totalExpense,
                netSavings: totalIncome - totalExpense,
                transactionCount: transactions.length
            },
            timeline: groupedTimeline,
            categoryBreakdown
        });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

const groupByWeek = (dailyData: { date: string; income: number; expense: number }[]) => {
    const weeklyData: Record<string, { week: string; income: number; expense: number }> = {};

    for (const day of dailyData) {
        const date = new Date(day.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekParts = weekStart.toISOString().split("T");
        const weekKey = weekParts[0] ?? "unknown";

        if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { week: weekKey, income: 0, expense: 0 };
        }
        weeklyData[weekKey].income += day.income;
        weeklyData[weekKey].expense += day.expense;
    }

    return Object.values(weeklyData).sort((a, b) =>
        new Date(a.week).getTime() - new Date(b.week).getTime()
    );
};

const groupByMonth = (dailyData: { date: string; income: number; expense: number }[]) => {
    const monthlyData: Record<string, { month: string; income: number; expense: number }> = {};

    for (const day of dailyData) {
        const monthKey = day.date.substring(0, 7);

        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { month: monthKey, income: 0, expense: 0 };
        }
        monthlyData[monthKey].income += day.income;
        monthlyData[monthKey].expense += day.expense;
    }

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
};

export const getWeeklyAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!._id;
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const prevStartOfWeek = new Date(startOfWeek);
        prevStartOfWeek.setDate(prevStartOfWeek.getDate() - 7);
        const prevEndOfWeek = new Date(startOfWeek);
        prevEndOfWeek.setMilliseconds(-1);

        const [currentWeekTx, prevWeekTx] = await Promise.all([
            Transaction.find({
                userId,
                createdAt: { $gte: startOfWeek, $lte: endOfWeek }
            }).populate("categoryId", "name"),
            Transaction.find({
                userId,
                createdAt: { $gte: prevStartOfWeek, $lte: prevEndOfWeek }
            })
        ]);

        let totalIncome = 0;
        let totalExpense = 0;
        let prevTotalIncome = 0;
        let prevTotalExpense = 0;
        const categoryTotals: Record<string, { name: string; amount: number }> = {};
        const dailyData: { day: string; income: number; expense: number }[] = [];

        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            dailyData.push({
                day: date.toLocaleDateString("vi-VN", { weekday: "short" }),
                income: 0,
                expense: 0
            });
        }

        for (const tx of currentWeekTx) {
            const dayIndex = Math.floor((tx.createdAt.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24));
            const catName = (tx.categoryId as any)?.name || "Khác";
            const catId = String((tx.categoryId as any)?._id || tx.categoryId);

            if (tx.type === "income") {
                totalIncome += tx.amount;
                const dayData = dailyData[dayIndex];
                if (dayIndex >= 0 && dayIndex < 7 && dayData) dayData.income += tx.amount;
            } else {
                totalExpense += tx.amount;
                const dayData = dailyData[dayIndex];
                if (dayIndex >= 0 && dayIndex < 7 && dayData) dayData.expense += tx.amount;

                if (!categoryTotals[catId]) {
                    categoryTotals[catId] = { name: catName, amount: 0 };
                }
                categoryTotals[catId].amount += tx.amount;
            }
        }

        for (const tx of prevWeekTx) {
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

        return res.json({
            period: { from: startOfWeek, to: endOfWeek },
            summary: {
                totalIncome,
                totalExpense,
                netSavings: totalIncome - totalExpense,
                transactionCount: currentWeekTx.length
            },
            comparison: {
                incomeChange,
                expenseChange,
                prevTotalIncome,
                prevTotalExpense
            },
            dailyBreakdown: dailyData,
            categoryBreakdown: Object.values(categoryTotals)
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5)
        });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const getYearlyAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!._id;
        const { year } = req.query;
        const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

        const startOfYear = new Date(targetYear, 0, 1);
        const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);

        const transactions = await Transaction.find({
            userId,
            createdAt: { $gte: startOfYear, $lte: endOfYear }
        }).populate("categoryId", "name");

        let totalIncome = 0;
        let totalExpense = 0;
        const monthlyData: { month: number; income: number; expense: number }[] = [];
        const categoryTotals: Record<string, { name: string; amount: number }> = {};

        for (let i = 0; i < 12; i++) {
            monthlyData.push({ month: i + 1, income: 0, expense: 0 });
        }

        for (const tx of transactions) {
            const monthIndex = tx.createdAt.getMonth();
            const catName = (tx.categoryId as any)?.name || "Khác";
            const catId = String((tx.categoryId as any)?._id || tx.categoryId);
            const monthData = monthlyData[monthIndex];

            if (tx.type === "income") {
                totalIncome += tx.amount;
                if (monthData) monthData.income += tx.amount;
            } else {
                totalExpense += tx.amount;
                if (monthData) monthData.expense += tx.amount;

                if (!categoryTotals[catId]) {
                    categoryTotals[catId] = { name: catName, amount: 0 };
                }
                categoryTotals[catId].amount += tx.amount;
            }
        }

        const avgMonthlyIncome = Math.round(totalIncome / 12);
        const avgMonthlyExpense = Math.round(totalExpense / 12);

        return res.json({
            year: targetYear,
            summary: {
                totalIncome,
                totalExpense,
                netSavings: totalIncome - totalExpense,
                avgMonthlyIncome,
                avgMonthlyExpense,
                transactionCount: transactions.length
            },
            monthlyBreakdown: monthlyData,
            categoryBreakdown: Object.values(categoryTotals)
                .sort((a, b) => b.amount - a.amount)
                .map(c => ({
                    name: c.name,
                    amount: c.amount,
                    percentage: totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0
                }))
        });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};
