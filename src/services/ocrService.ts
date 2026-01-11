import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "../config/env";

interface OCRResult {
    success: boolean;
    data?: {
        amount?: number;
        date?: string;
        description?: string;
        suggestedCategory?: string;
        confidence: number;
    };
    error?: string;
    rawText?: string;
}

const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);

export const processReceiptImage = async (imageBase64: string): Promise<OCRResult> => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Phân tích hóa đơn/biên lai trong hình. Trích xuất thông tin và trả về JSON với format:
{
    "amount": <số tiền (number, không có đơn vị)>,
    "date": "<ngày giao dịch format YYYY-MM-DD>",
    "description": "<mô tả ngắn gọn về giao dịch>",
    "suggestedCategory": "<một trong các danh mục: Ăn uống, Mua sắm, Di chuyển, Giải trí, Hóa đơn, Y tế, Giáo dục, Khác>",
    "confidence": <độ tin cậy từ 0 đến 1>
}

Nếu không thể đọc được hóa đơn, trả về:
{
    "error": "Không thể đọc hóa đơn",
    "confidence": 0
}

Chỉ trả về JSON, không có text khác.`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBase64
                }
            }
        ]);

        const responseText = result.response.text();
        const cleanedJson = responseText.replace(/```json\n?|\n?```/g, "").trim();

        const parsedResult = JSON.parse(cleanedJson);

        if (parsedResult.error) {
            return {
                success: false,
                error: parsedResult.error,
                rawText: responseText
            };
        }

        return {
            success: true,
            data: {
                amount: parsedResult.amount,
                date: parsedResult.date,
                description: parsedResult.description,
                suggestedCategory: parsedResult.suggestedCategory,
                confidence: parsedResult.confidence
            },
            rawText: responseText
        };
    } catch (err: any) {
        return {
            success: false,
            error: "Không thể xử lý hình ảnh",
            rawText: err.message
        };
    }
};

export const mapCategoryName = (suggestedCategory: string): string => {
    const categoryMap: Record<string, string> = {
        "Ăn uống": "food",
        "Mua sắm": "shopping",
        "Di chuyển": "transport",
        "Giải trí": "entertainment",
        "Hóa đơn": "bills",
        "Y tế": "health",
        "Giáo dục": "education",
        "Khác": "other"
    };

    return categoryMap[suggestedCategory] || "other";
};
