import cron from "node-cron";
import { Transaction } from "../models/Transaction";
import { Wallet } from "../models/Wallet";
import { Budget } from "../models/Budget";
import { createNotification } from "../services/notificationService";
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

const checkBudgetAndNotify = async (
    userId: mongoose.Types.ObjectId,
    categoryId: mongoose.Types.ObjectId
) => {
    const budgets = await Budget.find({
        userId,
        categoryId,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
    }).populate("categoryId", "name");

    for (const budget of budgets) {
        const budgetCategoryId = (budget.categoryId as any)?._id || budget.categoryId;
        const categoryName = (budget.categoryId as any)?.name || "Unknown";

        const totalSpent = await Transaction.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId as any),
                    categoryId: new mongoose.Types.ObjectId(budgetCategoryId),
                    type: "expense",
                    createdAt: { $gte: budget.startDate, $lte: budget.endDate }
                }
            },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        const spent = totalSpent[0]?.total || 0;

        if (spent >= budget.limit) {
            const deficit = spent - budget.limit;
            await createNotification({
                userId,
                type: "budget_exceeded",
                title: "Vượt ngân sách",
                message: `Giao dịch định kỳ khiến ${categoryName} vượt ngân sách. Chi tiêu: ${spent.toLocaleString("vi-VN")} VND / Hạn mức: ${budget.limit.toLocaleString("vi-VN")} VND`,
                data: {
                    budgetId: budget._id,
                    categoryId: budgetCategoryId,
                    spent,
                    limit: budget.limit,
                    deficit
                }
            });
        } else if (spent >= budget.limit * budget.alertThreshold) {
            await createNotification({
                userId,
                type: "budget_warning",
                title: "Cảnh báo ngân sách",
                message: `Giao dịch định kỳ khiến ${categoryName} sắp hết ngân sách. Chi tiêu: ${spent.toLocaleString("vi-VN")} VND / Hạn mức: ${budget.limit.toLocaleString("vi-VN")} VND`,
                data: {
                    budgetId: budget._id,
                    categoryId: budgetCategoryId,
                    spent,
                    limit: budget.limit
                }
            });
        }
    }
};

export const recurringTransactionsJob = () => {
    cron.schedule("0 0 * * *", async () => {
        const startTime = Date.now();
        let processed = 0;
        let failed = 0;

        try {
            const now = new Date();

            const recurringTxs = await Transaction.find({
                isRecurring: true,
                recurringFrequency: { $exists: true },
                nextRecurringDate: { $lte: now }
            }).populate("categoryId", "name");

            for (const tx of recurringTxs) {
                try {
                    const newTx = new Transaction({
                        userId: tx.userId,
                        walletId: tx.walletId,
                        categoryId: tx.categoryId,
                        type: tx.type,
                        amount: tx.amount,
                        currency: tx.currency,
                        exchangeRate: tx.exchangeRate,
                        location: tx.location,
                        tags: tx.tags,
                        evidence: tx.evidence,
                        isRecurring: false
                    });

                    await newTx.save();

                    const balanceChange = tx.type === "income" ? tx.amount : -tx.amount;
                    await Wallet.findByIdAndUpdate(tx.walletId, { $inc: { balance: balanceChange } });

                    await Transaction.findByIdAndUpdate(tx._id, {
                        lastRecurringDate: now,
                        nextRecurringDate: calculateNextRecurringDate(tx.recurringFrequency!, now)
                    });

                    const categoryName = (tx.categoryId as any)?.name || "Unknown";
                    const typeText = tx.type === "income" ? "thu nhập" : "chi tiêu";

                    await createNotification({
                        userId: tx.userId,
                        type: "recurring_transaction",
                        title: "Giao dịch định kỳ",
                        message: `Đã tạo giao dịch ${typeText} định kỳ: ${tx.amount.toLocaleString("vi-VN")} VND cho ${categoryName}`,
                        data: {
                            transactionId: newTx._id,
                            amount: tx.amount,
                            type: tx.type,
                            categoryName
                        }
                    });

                    if (tx.type === "expense") {
                        await checkBudgetAndNotify(
                            tx.userId as mongoose.Types.ObjectId,
                            (tx.categoryId as any)?._id || tx.categoryId
                        );
                    }

                    processed++;
                } catch (txErr) {
                    failed++;
                }
            }

            const duration = Date.now() - startTime;
            if (processed > 0 || failed > 0) {
                console.log(`[RecurringJob] Processed: ${processed}, Failed: ${failed}, Duration: ${duration}ms`);
            }
        } catch (err) {
            console.error("[RecurringJob] Critical error:", err);
        }
    });
};
