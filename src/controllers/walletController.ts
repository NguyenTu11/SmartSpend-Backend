import { Response } from "express";
import { Wallet } from "../models/Wallet";
import { Transaction } from "../models/Transaction";
import { AuthRequest } from "../middlewares/authMiddleware";
import { ErrorMessages } from "../utils/errorMessages";
import { validators } from "../middlewares/validationMiddleware";
import mongoose from "mongoose";

export const createWallet = async (req: AuthRequest, res: Response) => {
    try {
        const { name, type, currency, balance, isExcludedFromTotal } = req.body;

        const nameValidation = validators.isValidText(name, 50, "Tên ví");
        if (!nameValidation.valid) {
            return res.status(400).json({ message: nameValidation.error });
        }

        const sanitizedName = validators.sanitizeString(name);

        const existingWallet = await Wallet.findOne({
            userId: req.user!._id,
            name: sanitizedName
        });
        if (existingWallet) {
            return res.status(400).json({ message: ErrorMessages.WALLET_NAME_DUPLICATE });
        }

        if (balance !== undefined && balance !== null) {
            const balanceValidation = validators.isValidPositiveNumber(balance, true);
            if (!balanceValidation.valid) {
                return res.status(400).json({ message: balanceValidation.error });
            }
            if (Number(balance) > 1000000000000) {
                return res.status(400).json({ message: ErrorMessages.AMOUNT_TOO_LARGE });
            }
        }

        const wallet = new Wallet({
            userId: req.user!._id,
            name: sanitizedName,
            type: type || "cash",
            currency: currency || "VND",
            balance: balance || 0,
            isExcludedFromTotal: !!isExcludedFromTotal
        });

        await wallet.save();
        return res.status(201).json(wallet);
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const getWallets = async (req: AuthRequest, res: Response) => {
    try {
        const wallets = await Wallet.find({ userId: req.user!._id });

        const totalBalance = wallets
            .filter(w => !w.isExcludedFromTotal)
            .reduce((sum, w) => sum + w.balance, 0);

        return res.json({
            data: wallets,
            totalBalance
        });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const updateWallet = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, balance, ...otherUpdates } = req.body;

        if (!id) {
            return res.status(400).json({ message: ErrorMessages.REQUIRED_FIELDS });
        }

        const updates: any = { ...otherUpdates };

        if (name !== undefined) {
            const nameValidation = validators.isValidText(name, 50, "Tên ví");
            if (!nameValidation.valid) {
                return res.status(400).json({ message: nameValidation.error });
            }
            const sanitizedName = validators.sanitizeString(name);

            const existingWallet = await Wallet.findOne({
                userId: req.user!._id,
                name: sanitizedName,
                _id: { $ne: new mongoose.Types.ObjectId(id) }
            });
            if (existingWallet) {
                return res.status(400).json({ message: ErrorMessages.WALLET_NAME_DUPLICATE });
            }

            updates.name = sanitizedName;
        }

        if (balance !== undefined) {
            const balanceValidation = validators.isValidPositiveNumber(balance, true);
            if (!balanceValidation.valid) {
                return res.status(400).json({ message: balanceValidation.error });
            }
            if (Number(balance) > 1000000000000) {
                return res.status(400).json({ message: ErrorMessages.AMOUNT_TOO_LARGE });
            }
            updates.balance = balance;
        }

        const wallet = await Wallet.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(id), userId: req.user!._id },
            updates,
            { new: true }
        );

        if (!wallet) {
            return res.status(404).json({ message: ErrorMessages.WALLET_NOT_FOUND });
        }

        return res.json(wallet);
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const deleteWallet = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: ErrorMessages.REQUIRED_FIELDS });
        }

        const transactionCount = await Transaction.countDocuments({
            walletId: new mongoose.Types.ObjectId(id),
            userId: req.user!._id
        });

        if (transactionCount > 0) {
            return res.status(400).json({
                message: ErrorMessages.WALLET_DELETE_HAS_TRANSACTIONS
            });
        }

        const wallet = await Wallet.findOneAndDelete({
            _id: new mongoose.Types.ObjectId(id),
            userId: req.user!._id
        });

        if (!wallet) {
            return res.status(404).json({ message: ErrorMessages.WALLET_NOT_FOUND });
        }

        return res.json({ message: "Đã xoá ví thành công" });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};
