import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "../config/env";
import { Transaction } from "../models/Transaction";
import { Category } from "../models/Category";
import { Budget } from "../models/Budget";
import { Wallet } from "../models/Wallet";
import { BudgetTransfer } from "../models/BudgetTransfer";
import mongoose from "mongoose";

const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);

interface SpendingData {
    wallets: any[];
    transactions: any[];
    categories: any[];
    budgets: any[];
    transfers: any[];
    summary: {
        totalBalance: number;
        totalSpentThisMonth: number;
        totalIncomeThisMonth: number;
        netSavings: number;
        transactionCount: number;
        topExpenseCategories: { name: string; amount: number }[];
        budgetStatus: { category: string; spent: number; limit: number; percentage: number }[];
    };
}

export const getSpendingData = async (userId: mongoose.Types.ObjectId): Promise<SpendingData> => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const wallets = await Wallet.find({ userId });

    const transactions = await Transaction.find({
        userId,
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    }).populate("categoryId", "name").populate("walletId", "name");

    const allTransactions = await Transaction.find({ userId })
        .populate("categoryId", "name")
        .sort({ createdAt: -1 })
        .limit(50);

    const categories = await Category.find({ userId });

    const budgets = await Budget.find({
        userId,
        startDate: { $lte: now },
        endDate: { $gte: now }
    }).populate("categoryId", "name");

    const transfers = await BudgetTransfer.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10);

    const categoryTotals: Record<string, number> = {};
    let totalSpentThisMonth = 0;
    let totalIncomeThisMonth = 0;

    for (const tx of transactions) {
        if (tx.type === "expense") {
            const cat = tx.categoryId as any;
            const catName = cat?.name || "Other";
            categoryTotals[catName] = (categoryTotals[catName] || 0) + tx.amount;
            totalSpentThisMonth += tx.amount;
        } else if (tx.type === "income") {
            totalIncomeThisMonth += tx.amount;
        }
    }

    const topExpenseCategories = Object.entries(categoryTotals)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

    const budgetStatus = [];
    for (const budget of budgets) {
        const budgetCategoryId = (budget.categoryId as any)?._id || budget.categoryId;
        const categoryName = (budget.categoryId as any)?.name || "Unknown";

        const spentResult = await Transaction.aggregate([
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

        const spent = spentResult[0]?.total || 0;
        const percentage = Math.round((spent / budget.limit) * 100);

        budgetStatus.push({
            category: categoryName,
            spent,
            limit: budget.limit,
            percentage
        });
    }

    return {
        wallets,
        transactions: allTransactions,
        categories,
        budgets,
        transfers,
        summary: {
            totalBalance,
            totalSpentThisMonth,
            totalIncomeThisMonth,
            netSavings: totalIncomeThisMonth - totalSpentThisMonth,
            transactionCount: transactions.length,
            topExpenseCategories,
            budgetStatus
        }
    };
};

export const generateAIResponse = async (
    message: string,
    spendingData: SpendingData,
    chatHistory: { role: "user" | "model"; content: string }[],
    userName: string,
    isFirstChat: boolean
): Promise<{ response: string; tokenUsage: { prompt: number; completion: number } }> => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const transferInfo = spendingData.transfers.length > 0
        ? spendingData.transfers.map(t => {
            return `- ${new Date(t.createdAt).toLocaleDateString("vi-VN")}: Chuyển ${t.amount.toLocaleString("vi-VN")} VND từ ${t.fromCategoryName} sang ${t.toCategoryName} (${t.status})`;
        }).join("\n")
        : "Chưa có chuyển ngân sách";

    const greetingInstruction = isFirstChat
        ? `Đây là lần đầu người dùng chat. Hãy chào họ bằng tên "${userName}" một cách thân thiện.`
        : "Không cần chào hỏi, trả lời trực tiếp câu hỏi.";

    const systemPrompt = `Bạn là trợ lý tài chính thông minh của ứng dụng VIMO. Luôn trả lời bằng tiếng Việt.

${greetingInstruction}

QUY TẮC TRẢ LỜI:
- Trả lời ngắn gọn, súc tích
- Nêu số liệu cụ thể: thu bao nhiêu, chi bao nhiêu, còn lại bao nhiêu
- Kết thúc bằng 1 hành động cụ thể người dùng nên làm

QUY TẮC VỀ NGÂN SÁCH:
- Nếu chi tiêu < 80%: An toàn, khen ngợi người dùng
- Nếu chi tiêu 80-99%: Cảnh báo sắp hết, khuyên hạn chế chi tiêu
- Nếu chi tiêu = 100%: Cảnh báo "Đã chạm trần hạn mức", khuyên NGỪNG chi tiêu cho danh mục này
- Nếu chi tiêu > 100%: Cảnh báo "Đã vượt ngân sách X VND"

TƯ DUY TÀI CHÍNH (QUAN TRỌNG):
- KHÔNG BAO GIỜ khuyên người dùng lấy tiền tiết kiệm ra bù vào chi tiêu thông thường
- Ưu tiên khuyên: cắt giảm chi tiêu, tự nấu ăn, hạn chế mua sắm không cần thiết
- Chỉ gợi ý dùng tiền tiết kiệm khi người dùng hỏi về trường hợp khẩn cấp
- Giọng điệu: nghiêm túc khi cảnh báo, thân thiện khi tư vấn

HƯỚNG DẪN SỬ DỤNG VIMO:
Khi người dùng hỏi cách dùng VIMO hoặc cần hướng dẫn, hãy trả lời thân thiện như một người bạn và chỉ dẫn theo bước họ đang ở:

BƯỚC 1 - TẠO VÍ TIỀN:
- Vào phần "Cài đặt" để tạo ví tiền
- Nhập số tiền ban đầu muốn quản lý (đây là tổng ngân sách để theo dõi thu chi)
- Nếu có nhiều ví (ví tiền mặt, ví điện tử...), có thể tạo nhiều ví riêng biệt

BƯỚC 2 - THÊM DANH MỤC THU/CHI:
- Tạo các danh mục thu và chi theo nhu cầu (Ăn uống, Đi lại, Mua sắm, Giải trí, Lương...)
- Phân loại này giúp theo dõi dòng tiền rõ ràng và dễ kiểm soát hơn
- Có thể tạo danh mục riêng theo thói quen chi tiêu của mình

BƯỚC 3 - THIẾT LẬP NGÂN SÁCH:
- Đặt ngân sách giới hạn cho từng danh mục chi tiêu
- Khi chi tiêu gần chạm hạn mức, hệ thống sẽ thông báo nhắc nhở
- Khi vượt quá ngân sách một danh mục:
  + Hệ thống kiểm tra các danh mục khác còn dư
  + Tự động đề xuất hoặc bù trừ từ danh mục còn đủ tiền
  + Giúp cân đối chi tiêu và hạn chế chi quá mức

BƯỚC 4 - THÊM GIAO DỊCH:
- Nhập tay thông tin giao dịch (số tiền, danh mục, ví)
- HOẶC quét ảnh hóa đơn - hệ thống tự động nhận diện thông tin (tiết kiệm thời gian)
- Mỗi giao dịch sẽ được ghi nhận vào lịch sử và ảnh hưởng đến số dư ví

BƯỚC 5 - PHÂN TÍCH VÀ TƯ VẤN BẰNG AI:
- Trò chuyện với AI (tôi) để:
  + Phân tích thói quen chi tiêu
  + Đánh giá tình hình tài chính
  + Nhận lời khuyên và gợi ý chi tiêu hợp lý hơn
  + Hỏi bất kỳ câu hỏi nào về tài chính

KHI NGƯỜI DÙNG HỎI VỀ BƯỚC CỤ THỂ:
- Nếu họ hỏi "đã tạo ví rồi, tiếp theo làm gì?" → Chỉ Bước 2
- Nếu họ hỏi "đã có danh mục rồi" → Chỉ Bước 3
- Nếu họ đang ở giữa chừng → Chỉ bước tiếp theo, KHÔNG lặp lại từ đầu
- Luôn kiểm tra dữ liệu của họ (số ví, số danh mục, số giao dịch) để biết họ đang ở bước nào

DỮ LIỆU TÀI CHÍNH:

TỔNG QUAN:
- Tổng số dư: ${spendingData.summary.totalBalance.toLocaleString("vi-VN")} VND
- Thu nhập tháng này: ${spendingData.summary.totalIncomeThisMonth.toLocaleString("vi-VN")} VND
- Chi tiêu tháng này: ${spendingData.summary.totalSpentThisMonth.toLocaleString("vi-VN")} VND
- Tiết kiệm: ${spendingData.summary.netSavings.toLocaleString("vi-VN")} VND
- Số giao dịch: ${spendingData.summary.transactionCount}

TOP CHI TIÊU:
${spendingData.summary.topExpenseCategories.map(c => `- ${c.name}: ${c.amount.toLocaleString("vi-VN")} VND`).join("\n") || "Chưa có"}

NGÂN SÁCH:
${spendingData.summary.budgetStatus.map(b => {
        const remaining = b.limit - b.spent;
        let status = "AN TOAN";
        if (b.percentage > 100) status = "DA VUOT";
        else if (b.percentage === 100) status = "CHAM TRAN";
        else if (b.percentage >= 80) status = "SAP HET";
        return `- ${b.category}: ${b.spent.toLocaleString("vi-VN")}/${b.limit.toLocaleString("vi-VN")} VND (${b.percentage}%) - Con lai: ${remaining.toLocaleString("vi-VN")} VND - ${status}`;
    }).join("\n") || "Chua thiet lap"}

CÁC VÍ:
${spendingData.wallets.map(w => `- ${w.name}: ${w.balance.toLocaleString("vi-VN")} VND`).join("\n")}

CHUYỂN NGÂN SÁCH GẦN ĐÂY:
${transferInfo}

GIAO DỊCH GẦN ĐÂY:
${spendingData.transactions.slice(0, 10).map(tx => {
        const cat = (tx.categoryId as any)?.name || "Khac";
        const date = new Date(tx.createdAt).toLocaleDateString("vi-VN");
        const sign = tx.type === "income" ? "+" : "-";
        return `- ${date}: ${sign}${tx.amount.toLocaleString("vi-VN")} VND (${cat})`;
    }).join("\n")}`;

    const geminiHistory = chatHistory.map(h => ({
        role: h.role as "user" | "model",
        parts: [{ text: h.content }]
    }));

    const chat = model.startChat({
        history: [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "Tôi đã nhận được dữ liệu tài chính của bạn. Hãy hỏi tôi bất cứ điều gì!" }] },
            ...geminiHistory
        ]
    });

    const result = await chat.sendMessage(message);
    const rawResponse = result.response.text();

    const cleanResponse = (text: string): string => {
        return text
            .replace(/\*\*/g, "")
            .replace(/\*/g, "")
            .replace(/#{1,6}\s?/g, "")
            .replace(/---/g, "")
            .replace(/```[\s\S]*?```/g, "")
            .replace(/`/g, "")
            .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, "")
            .replace(/\n{2,}/g, "\n")
            .trim();
    };

    const response = cleanResponse(rawResponse);

    return {
        response,
        tokenUsage: {
            prompt: 0,
            completion: 0
        }
    };
};
