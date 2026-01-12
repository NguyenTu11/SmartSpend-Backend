import { Response } from "express";
import { Category } from "../models/Category";
import { Transaction } from "../models/Transaction";
import { Budget } from "../models/Budget";
import { AuthRequest } from "../middlewares/authMiddleware";
import { ErrorMessages } from "../utils/errorMessages";
import mongoose from "mongoose";

export const createCategory = async (req: AuthRequest, res: Response) => {
    try {
        const { name, type, parentId, keywords } = req.body;

        if (!name) return res.status(400).json({ message: ErrorMessages.CATEGORY_NAME_REQUIRED });

        const category = new Category({
            userId: req.user!._id,
            name,
            type: type || "expense",
            parentId: parentId ? new mongoose.Types.ObjectId(parentId) : undefined,
            keywords: keywords || [],
        });

        await category.save();
        return res.status(201).json(category);
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const getCategories = async (req: AuthRequest, res: Response) => {
    try {
        const categories = await Category.find({ userId: req.user!._id });
        return res.json(categories);
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const updateCategory = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, type, parentId, keywords } = req.body;

        if (!id) return res.status(400).json({ message: ErrorMessages.REQUIRED_FIELDS });

        const updateData: any = {};
        if (name) updateData.name = name;
        if (type) updateData.type = type;
        if (keywords) updateData.keywords = keywords;
        if (parentId) updateData.parentId = new mongoose.Types.ObjectId(parentId);

        const category = await Category.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(id), userId: req.user!._id },
            updateData,
            { new: true }
        );

        if (!category) return res.status(404).json({ message: ErrorMessages.CATEGORY_NOT_FOUND });
        return res.json(category);
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: ErrorMessages.REQUIRED_FIELDS });

        const categoryId = new mongoose.Types.ObjectId(id);

        const transactionCount = await Transaction.countDocuments({
            categoryId,
            userId: req.user!._id
        });

        if (transactionCount > 0) {
            return res.status(400).json({
                message: ErrorMessages.CATEGORY_DELETE_HAS_TRANSACTIONS
            });
        }

        const budgetCount = await Budget.countDocuments({
            categoryId,
            userId: req.user!._id
        });

        if (budgetCount > 0) {
            return res.status(400).json({
                message: "Không thể xoá danh mục đang có ngân sách. Vui lòng xoá ngân sách trước"
            });
        }

        const category = await Category.findOneAndDelete({
            _id: categoryId,
            userId: req.user!._id,
        });

        if (!category) return res.status(404).json({ message: ErrorMessages.CATEGORY_NOT_FOUND });
        return res.json({ message: "Đã xoá danh mục thành công" });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};
