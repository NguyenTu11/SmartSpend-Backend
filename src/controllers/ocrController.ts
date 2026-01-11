import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { processReceiptImage } from "../services/ocrService";
import { uploadBase64Image } from "../services/cloudinary";
import { Category } from "../models/Category";
import { ErrorMessages } from "../utils/errorMessages";

export const scanReceipt = async (req: AuthRequest, res: Response) => {
    try {
        const { image, saveImage } = req.body;

        if (!image) {
            return res.status(400).json({ message: ErrorMessages.OCR_IMAGE_REQUIRED });
        }

        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        const result = await processReceiptImage(base64Data);

        if (!result.success) {
            return res.status(422).json({
                message: ErrorMessages.OCR_PROCESSING_FAILED,
                error: result.error
            });
        }

        let imageUrl = null;
        if (saveImage) {
            const uploadResult = await uploadBase64Image(image, "receipts");
            imageUrl = uploadResult.url;
        }

        const categories = await Category.find({ userId: req.user!._id });
        let matchedCategoryId = null;

        if (result.data?.suggestedCategory && categories.length > 0) {
            const suggested = result.data.suggestedCategory.toLowerCase();
            const matched = categories.find(c =>
                c.name.toLowerCase().includes(suggested) ||
                suggested.includes(c.name.toLowerCase())
            );
            if (matched) {
                matchedCategoryId = matched._id;
            }
        }

        return res.json({
            success: true,
            extractedData: result.data,
            imageUrl,
            matchedCategoryId,
            availableCategories: categories.map(c => ({ _id: c._id, name: c.name }))
        });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const uploadReceiptImage = async (req: AuthRequest, res: Response) => {
    try {
        const file = req.file as Express.Multer.File & { path?: string };

        if (!file) {
            return res.status(400).json({ message: ErrorMessages.OCR_IMAGE_REQUIRED });
        }

        const imageUrl = file.path;
        const publicId = (file as any).filename;

        return res.json({
            success: true,
            url: imageUrl,
            publicId
        });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};
