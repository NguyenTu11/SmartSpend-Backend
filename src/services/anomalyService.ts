import { Transaction } from "../models/Transaction";
import { Notification } from "../models/Notification";
import mongoose from "mongoose";

interface AnomalyResult {
    isAnomaly: boolean;
    reason?: string;
    severity?: "low" | "medium" | "high";
    averageAmount?: number;
    transactionAmount?: number;
    ratio?: number;
}

export const detectAnomaly = async (
    userId: mongoose.Types.ObjectId,
    categoryId: mongoose.Types.ObjectId,
    amount: number,
    categoryName: string
): Promise<AnomalyResult> => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTransactions = await Transaction.find({
        userId,
        categoryId,
        type: "expense",
        createdAt: { $gte: thirtyDaysAgo }
    });

    if (recentTransactions.length < 5) {
        return { isAnomaly: false };
    }

    const amounts = recentTransactions.map(tx => tx.amount);
    const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    const sortedAmounts = [...amounts].sort((a, b) => a - b);
    const midIndex = Math.floor(sortedAmounts.length / 2);
    const median = sortedAmounts.length % 2 === 0
        ? ((sortedAmounts[midIndex - 1] ?? 0) + (sortedAmounts[midIndex] ?? 0)) / 2
        : (sortedAmounts[midIndex] ?? 0);

    const baselineAmount = (average + median) / 2;
    const ratio = amount / baselineAmount;

    if (ratio >= 5) {
        return {
            isAnomaly: true,
            reason: `Chi tiêu ${categoryName} cao gấp ${ratio.toFixed(1)} lần trung bình`,
            severity: "high",
            averageAmount: Math.round(baselineAmount),
            transactionAmount: amount,
            ratio: Math.round(ratio * 10) / 10
        };
    } else if (ratio >= 3) {
        return {
            isAnomaly: true,
            reason: `Chi tiêu ${categoryName} cao gấp ${ratio.toFixed(1)} lần trung bình`,
            severity: "medium",
            averageAmount: Math.round(baselineAmount),
            transactionAmount: amount,
            ratio: Math.round(ratio * 10) / 10
        };
    }

    return { isAnomaly: false };
};

export const createAnomalyNotification = async (
    userId: mongoose.Types.ObjectId,
    anomalyResult: AnomalyResult,
    transactionId: mongoose.Types.ObjectId
): Promise<void> => {
    if (!anomalyResult.isAnomaly || !anomalyResult.reason) return;

    const title = anomalyResult.severity === "high"
        ? "Chi tiêu bất thường nghiêm trọng"
        : "Phát hiện chi tiêu bất thường";

    await Notification.create({
        userId,
        type: "anomaly_detected",
        title,
        message: anomalyResult.reason,
        isRead: false,
        data: {
            transactionId,
            averageAmount: anomalyResult.averageAmount ?? 0,
            transactionAmount: anomalyResult.transactionAmount ?? 0,
            ratio: anomalyResult.ratio ?? 0,
            severity: anomalyResult.severity ?? "low"
        }
    });
};

export const getAnomalyHistory = async (
    userId: mongoose.Types.ObjectId,
    limit: number = 20
) => {
    const notifications = await Notification.find({
        userId,
        type: "anomaly_detected"
    })
        .sort({ createdAt: -1 })
        .limit(limit);

    return notifications;
};
