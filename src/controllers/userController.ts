import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { calculateFinancialScore } from "../services/financialScoreService";
import { uploadBase64Image, deleteImage } from "../services/cloudinary";
import { User } from "../models/User";
import { ErrorMessages } from "../utils/errorMessages";
import mongoose from "mongoose";

export const getFinancialScore = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!._id as mongoose.Types.ObjectId;
        const result = await calculateFinancialScore(userId);

        return res.json({
            score: result.score,
            grade: result.grade,
            components: result.components,
            recommendations: result.recommendations,
            calculatedAt: new Date().toISOString()
        });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.FINANCIAL_SCORE_ERROR });
    }
};

export const getUserProfile = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user!;

        return res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            currency: user.currency,
            language: user.language,
            createdAt: user.createdAt
        });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
    try {
        const { name, bio, currency, language, avatarImage } = req.body;
        const updates: any = {};

        if (name) updates.name = name;
        if (bio !== undefined) updates.bio = bio;
        if (currency) updates.currency = currency;
        if (language) updates.language = language;

        if (avatarImage) {
            const user = await User.findById(req.user!._id);
            if (user?.avatar?.publicId) {
                await deleteImage(user.avatar.publicId);
            }

            const uploadResult = await uploadBase64Image(avatarImage, "avatars");
            updates.avatar = {
                url: uploadResult.url,
                publicId: uploadResult.publicId
            };
        }

        const user = await User.findByIdAndUpdate(
            req.user!._id,
            updates,
            { new: true }
        ).select("-password");

        return res.json(user);
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const uploadAvatar = async (req: AuthRequest, res: Response) => {
    try {
        const file = req.file as Express.Multer.File & { path?: string };

        if (!file) {
            return res.status(400).json({ message: "Vui lòng tải lên ảnh đại diện" });
        }

        const oldUser = await User.findById(req.user!._id);
        if (oldUser?.avatar?.publicId) {
            await deleteImage(oldUser.avatar.publicId);
        }

        const imageUrl = file.path;
        const publicId = (file as any).filename;

        const user = await User.findByIdAndUpdate(
            req.user!._id,
            { avatar: { url: imageUrl, publicId } },
            { new: true }
        ).select("-password");

        return res.json({
            message: "Cập nhật ảnh đại diện thành công",
            avatar: user?.avatar
        });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const deleteAvatar = async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user!._id);

        if (user?.avatar?.publicId) {
            await deleteImage(user.avatar.publicId);
        }

        await User.findByIdAndUpdate(req.user!._id, {
            $unset: { avatar: 1 }
        });

        return res.json({ message: "Đã xoá ảnh đại diện" });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};
