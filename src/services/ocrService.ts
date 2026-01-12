import Tesseract from "tesseract.js";

interface OCRResult {
    success: boolean;
    data?: {
        amount?: number;
        date?: string | undefined;
        description?: string;
        suggestedCategory?: string;
        confidence: number;
    };
    error?: string;
    rawText?: string;
}

const normalizeText = (text: string): string => {
    return text
        .replace(/[oO]/g, (match, offset, str) => {
            const before = str[offset - 1];
            const after = str[offset + 1];
            if (before && /[0-9]/.test(before)) return "0";
            if (after && /[0-9]/.test(after)) return "0";
            return match;
        })
        .replace(/\s+/g, " ");
};

const removePhoneNumbers = (text: string): string => {
    return text
        .replace(/(?:\+84|0)\s*[0-9]{2,3}[\s.-]*[0-9]{3}[\s.-]*[0-9]{3,4}/g, " ")
        .replace(/đt\s*:?\s*[0-9.\s-]+/gi, " ")
        .replace(/tel\s*:?\s*[0-9.\s-]+/gi, " ")
        .replace(/\b[0-9]{10,}\b/g, " ");
};

const parseNumber = (str: string): number | undefined => {
    let cleaned = str.replace(/\s/g, "").trim();
    if (!cleaned) return undefined;

    const hasEuropeanFormat = /^[0-9]{1,3}\.[0-9]{3},[0-9]{2}$/.test(cleaned);
    if (hasEuropeanFormat) {
        cleaned = cleaned.replace(/\./g, "").replace(",", "");
    } else {
        const endsWithPartialCents = /[.,][0-9]{2}$/.test(cleaned) && !/[.,][0-9]{3}/.test(cleaned);
        if (endsWithPartialCents) {
            cleaned = cleaned.replace(/[.,][0-9]{2}$/, "");
            cleaned = cleaned.replace(/[.,]/g, "");
        } else {
            cleaned = cleaned.replace(/[.,]/g, "");
        }
    }

    if (cleaned.length > 9 || cleaned.length < 3) return undefined;
    const num = parseInt(cleaned, 10);
    if (num >= 1000 && num <= 500000000) return num;
    return undefined;
};

const correctOCRAmount = (amount: number, rawText: string): number => {
    const lowerText = rawText.toLowerCase();

    if (amount < 10000) {
        const possibleCorrect = amount * 10;
        const amountStr = amount.toString();
        const correctedStr = possibleCorrect.toString();

        const patterns = [
            new RegExp(`${correctedStr.slice(0, 2)}[.,\\s]?${correctedStr.slice(2)}`, "i"),
            new RegExp(`${amountStr}[.,]?0{1,3}`, "i"),
        ];

        for (const pattern of patterns) {
            if (pattern.test(lowerText.replace(/\s/g, ""))) {
                return possibleCorrect;
            }
        }

        if (/[.,]000\b/.test(rawText) || /[.,]0{3}\b/.test(rawText)) {
            return possibleCorrect;
        }
    }

    return amount;
};

const parseAmount = (text: string): number | undefined => {
    const normalizedText = normalizeText(text);
    const cleanedText = removePhoneNumbers(normalizedText).toLowerCase();
    const originalText = text;

    const priorityPatterns = [
        /(?:phải\s*trả|phai\s*tra|cần\s*thanh\s*toán|can\s*thanh\s*toan)[:\s]*([0-9][0-9.,\s]*[0-9])/gi,
        /(?:tổng\s*(?:tiền\s*)?thanh\s*toán|tong\s*(?:tien\s*)?thanh\s*toan)[:\s]*([0-9][0-9.,\s]*[0-9])/gi,
        /(?:tổng\s*cộng|tong\s*cong)[:\s]*([0-9][0-9.,\s]*[0-9])/gi,
        /(?:grand\s*total|total\s*amount)[:\s]*([0-9][0-9.,\s]*[0-9])/gi,
        /(?:total)[:\s]*([0-9][0-9.,\s]*[0-9])/gi,
        /(?:thành\s*tiền|thanh\s*tien)[:\s]*([0-9][0-9.,\s]*[0-9])/gi,
        /(?:tổng\s*tiền|tong\s*tien)[:\s]*([0-9][0-9.,\s]*[0-9])/gi,
        /(?:tiền\s*hàng|tien\s*hang)[:\s]*([0-9][0-9.,\s]*[0-9])/gi,
    ];

    for (const pattern of priorityPatterns) {
        pattern.lastIndex = 0;
        const matches: { amount: number; raw: string }[] = [];
        let match;
        while ((match = pattern.exec(cleanedText)) !== null) {
            if (match[1]) {
                const amount = parseNumber(match[1]);
                if (amount) {
                    matches.push({ amount, raw: match[1] });
                }
            }
        }
        if (matches.length > 0) {
            const best = matches.reduce((a, b) => a.amount > b.amount ? a : b);
            return correctOCRAmount(best.amount, originalText);
        }
    }

    const currencyPatterns = [
        /([0-9]{1,3}(?:[.,][0-9]{3})+)\s*(?:đ|đồng|vnd|vnđ)/gi,
        /([0-9]{4,9})\s*(?:đ|đồng|vnd|vnđ)/gi,
        /(?:vnd|cny|usd)\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)/gi,
    ];

    const amounts: number[] = [];
    for (const pattern of currencyPatterns) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(cleanedText)) !== null) {
            if (match[1]) {
                const amount = parseNumber(match[1]);
                if (amount) amounts.push(amount);
            }
        }
    }

    if (amounts.length > 0) {
        const maxAmount = Math.max(...amounts);
        return correctOCRAmount(maxAmount, originalText);
    }

    const fallbackPattern = /\b([0-9]{1,3}(?:[.,][0-9]{3})+)\b/g;
    let match;
    while ((match = fallbackPattern.exec(cleanedText)) !== null) {
        if (match[1]) {
            const amount = parseNumber(match[1]);
            if (amount && amount >= 10000) amounts.push(amount);
        }
    }

    if (amounts.length > 0) {
        return Math.max(...amounts);
    }

    return undefined;
};

const parseDate = (text: string): string | undefined => {
    const patterns = [
        /(\d{1,2})[\/\-.\s]+(\d{1,2})[\/\-.\s]+(\d{4})/,
        /(\d{4})[\/\-.\s]+(\d{1,2})[\/\-.\s]+(\d{1,2})/,
        /ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})/i,
        /ngay\s*(\d{1,2})\s*thang\s*(\d{1,2})\s*nam\s*(\d{4})/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1] && match[2] && match[3]) {
            let day: string, month: string, year: string;
            if (pattern.source.includes("năm") || pattern.source.includes("nam")) {
                day = match[1];
                month = match[2];
                year = match[3];
            } else if (match[1].length === 4) {
                year = match[1];
                month = match[2];
                day = match[3];
            } else {
                day = match[1];
                month = match[2];
                year = match[3];
            }
            const d = parseInt(day, 10);
            const m = parseInt(month, 10);
            if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
                return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            }
        }
    }
    return undefined;
};

const detectCategory = (text: string): string => {
    const lowerText = text.toLowerCase();

    const categoryKeywords: Record<string, string[]> = {
        "Ăn uống": ["café", "cafe", "coffee", "nhà hàng", "nha hang", "quán", "quan", "ăn", "an uong", "uống", "bánh", "banh", "food", "drink", "sinh tố", "sinh to", "trà", "tra sua", "sữa", "sua", "cơm", "com", "phở", "pho", "bún", "bun", "rice", "noodle", "vermicelli", "restaurant", "mancook", "storm"],
        "Mua sắm": ["shop", "store", "siêu thị", "sieu thi", "market", "mua", "bán", "ban", "thời trang", "thoi trang", "điện máy", "dien may", "import", "export", "trading"],
        "Di chuyển": ["grab", "taxi", "xe", "xăng", "xang", "parking", "gửi xe", "gui xe", "vé", "ve"],
        "Giải trí": ["cinema", "game", "karaoke", "spa", "massage"],
        "Hóa đơn": ["điện", "dien", "nước", "nuoc", "internet", "wifi", "điện thoại", "dien thoai", "bill"],
        "Y tế": ["thuốc", "thuoc", "pharmacy", "bệnh viện", "benh vien", "phòng khám", "phong kham", "doctor"],
        "Giáo dục": ["sách", "sach", "học", "hoc", "school", "course", "khóa học", "khoa hoc"]
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        for (const keyword of keywords) {
            if (lowerText.includes(keyword)) {
                return category;
            }
        }
    }

    return "Khác";
};

export const processReceiptImage = async (imageBase64: string): Promise<OCRResult> => {
    try {
        const imageBuffer = Buffer.from(imageBase64, "base64");

        const result = await Tesseract.recognize(imageBuffer, "vie+eng", {
            logger: () => { }
        });

        const text = result.data.text;
        const confidence = result.data.confidence / 100;

        if (!text || text.trim().length < 10) {
            return {
                success: false,
                error: "Không thể đọc nội dung hóa đơn",
                rawText: text
            };
        }

        const amount = parseAmount(text);
        const date = parseDate(text);
        const category = detectCategory(text);

        if (!amount) {
            return {
                success: false,
                error: "Không tìm thấy số tiền trong hóa đơn",
                rawText: text
            };
        }

        return {
            success: true,
            data: {
                amount,
                date: date || undefined,
                description: "Giao dịch từ hóa đơn",
                suggestedCategory: category,
                confidence
            },
            rawText: text
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
            success: false,
            error: "Không thể xử lý hình ảnh",
            rawText: message
        };
    }
};
