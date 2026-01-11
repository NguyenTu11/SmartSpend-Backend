import { Transaction } from "../models/Transaction";
import { Budget } from "../models/Budget";
import mongoose from "mongoose";

interface FinancialScoreResult {
    score: number;
    grade: "A" | "B" | "C" | "D" | "F";
    components: {
        budgetCompliance: { score: number; maxScore: number; details: string };
        savingsRate: { score: number; maxScore: number; details: string };
        consistency: { score: number; maxScore: number; details: string };
    };
    recommendations: string[];
}

export const calculateFinancialScore = async (userId: mongoose.Types.ObjectId): Promise<FinancialScoreResult> => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const transactions = await Transaction.find({
        userId,
        createdAt: { $gte: threeMonthsAgo }
    });

    const budgets = await Budget.find({
        userId,
        startDate: { $lte: now },
        endDate: { $gte: now }
    });

    let budgetComplianceScore = 0;
    let budgetComplianceDetails = "";
    const maxBudgetScore = 40;

    if (budgets.length > 0) {
        let compliantBudgets = 0;
        let totalBudgets = budgets.length;

        for (const budget of budgets) {
            const budgetCategoryId = budget.categoryId;
            const spent = transactions
                .filter(tx =>
                    tx.type === "expense" &&
                    String(tx.categoryId) === String(budgetCategoryId) &&
                    tx.createdAt >= budget.startDate &&
                    tx.createdAt <= budget.endDate
                )
                .reduce((sum, tx) => sum + tx.amount, 0);

            if (spent <= budget.limit) {
                compliantBudgets++;
            }
        }

        const complianceRate = compliantBudgets / totalBudgets;
        budgetComplianceScore = Math.round(complianceRate * maxBudgetScore);
        budgetComplianceDetails = `${compliantBudgets}/${totalBudgets} ngân sách tuân thủ`;
    } else {
        budgetComplianceScore = 20;
        budgetComplianceDetails = "Chưa thiết lập ngân sách";
    }

    let savingsScore = 0;
    let savingsDetails = "";
    const maxSavingsScore = 30;

    const monthlyData: Record<string, { income: number; expense: number }> = {};
    for (const tx of transactions) {
        const monthKey = `${tx.createdAt.getFullYear()}-${tx.createdAt.getMonth()}`;
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { income: 0, expense: 0 };
        }
        if (tx.type === "income") {
            monthlyData[monthKey].income += tx.amount;
        } else {
            monthlyData[monthKey].expense += tx.amount;
        }
    }

    const months = Object.values(monthlyData);
    if (months.length > 0) {
        let totalSavingsRate = 0;
        let validMonths = 0;

        for (const month of months) {
            if (month.income > 0) {
                const savingsRate = (month.income - month.expense) / month.income;
                totalSavingsRate += Math.max(0, savingsRate);
                validMonths++;
            }
        }

        if (validMonths > 0) {
            const avgSavingsRate = totalSavingsRate / validMonths;
            if (avgSavingsRate >= 0.3) {
                savingsScore = maxSavingsScore;
            } else if (avgSavingsRate >= 0.2) {
                savingsScore = Math.round(maxSavingsScore * 0.8);
            } else if (avgSavingsRate >= 0.1) {
                savingsScore = Math.round(maxSavingsScore * 0.6);
            } else if (avgSavingsRate > 0) {
                savingsScore = Math.round(maxSavingsScore * 0.4);
            } else {
                savingsScore = Math.round(maxSavingsScore * 0.2);
            }
            savingsDetails = `Tỷ lệ tiết kiệm trung bình: ${Math.round(avgSavingsRate * 100)}%`;
        } else {
            savingsScore = 15;
            savingsDetails = "Chưa có dữ liệu thu nhập";
        }
    } else {
        savingsScore = 15;
        savingsDetails = "Chưa có dữ liệu giao dịch";
    }

    let consistencyScore = 0;
    let consistencyDetails = "";
    const maxConsistencyScore = 30;

    if (months.length >= 2) {
        const expenseAmounts = months.map(m => m.expense).filter(e => e > 0);
        if (expenseAmounts.length >= 2) {
            const avgExpense = expenseAmounts.reduce((a, b) => a + b, 0) / expenseAmounts.length;
            const variance = expenseAmounts.reduce((sum, e) => sum + Math.pow(e - avgExpense, 2), 0) / expenseAmounts.length;
            const stdDev = Math.sqrt(variance);
            const cv = stdDev / avgExpense;

            if (cv <= 0.15) {
                consistencyScore = maxConsistencyScore;
                consistencyDetails = "Chi tiêu rất ổn định";
            } else if (cv <= 0.25) {
                consistencyScore = Math.round(maxConsistencyScore * 0.8);
                consistencyDetails = "Chi tiêu ổn định";
            } else if (cv <= 0.4) {
                consistencyScore = Math.round(maxConsistencyScore * 0.6);
                consistencyDetails = "Chi tiêu tương đối ổn định";
            } else if (cv <= 0.6) {
                consistencyScore = Math.round(maxConsistencyScore * 0.4);
                consistencyDetails = "Chi tiêu có biến động";
            } else {
                consistencyScore = Math.round(maxConsistencyScore * 0.2);
                consistencyDetails = "Chi tiêu biến động mạnh";
            }
        } else {
            consistencyScore = 15;
            consistencyDetails = "Chưa đủ dữ liệu chi tiêu";
        }
    } else {
        consistencyScore = 15;
        consistencyDetails = "Cần thêm dữ liệu để đánh giá";
    }

    const totalScore = budgetComplianceScore + savingsScore + consistencyScore;

    let grade: "A" | "B" | "C" | "D" | "F";
    if (totalScore >= 85) grade = "A";
    else if (totalScore >= 70) grade = "B";
    else if (totalScore >= 55) grade = "C";
    else if (totalScore >= 40) grade = "D";
    else grade = "F";

    const recommendations: string[] = [];

    if (budgetComplianceScore < 30) {
        recommendations.push("Thiết lập và tuân thủ ngân sách cho các danh mục chi tiêu chính");
    }
    if (savingsScore < 20) {
        recommendations.push("Cố gắng tiết kiệm ít nhất 10-20% thu nhập mỗi tháng");
    }
    if (consistencyScore < 20) {
        recommendations.push("Lập kế hoạch chi tiêu để ổn định hơn qua các tháng");
    }
    if (totalScore >= 70) {
        recommendations.push("Tiếp tục duy trì thói quen chi tiêu tốt!");
    }

    return {
        score: totalScore,
        grade,
        components: {
            budgetCompliance: {
                score: budgetComplianceScore,
                maxScore: maxBudgetScore,
                details: budgetComplianceDetails
            },
            savingsRate: {
                score: savingsScore,
                maxScore: maxSavingsScore,
                details: savingsDetails
            },
            consistency: {
                score: consistencyScore,
                maxScore: maxConsistencyScore,
                details: consistencyDetails
            }
        },
        recommendations
    };
};
