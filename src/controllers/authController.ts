import { Request, Response } from "express";
import { User } from "../models/User";
import { EmailVerification } from "../models/EmailVerification";
import { sendEmail } from "../services/emailService";
import { ENV } from "../config/env";
import { ErrorMessages } from "../utils/errorMessages";
import jwt from "jsonwebtoken";
import { generateRandomCode } from "../utils/random";

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, name } = req.body;

        const existing = await User.findOne({ email });
        if (existing)
            return res.status(400).json({ message: ErrorMessages.EMAIL_EXISTS });

        const user = new User({ email, password, name });
        await user.save();

        const code = generateRandomCode();
        const expire = new Date();
        expire.setMinutes(expire.getMinutes() + 10);

        const emailVer = new EmailVerification({
            userId: user._id,
            email: user.email,
            codeHash: code,
            expiredAt: expire
        });
        await emailVer.save();

        await sendEmail(user.email, "Mã xác thực SmartSpend", `Mã xác thực của bạn là: ${code}. Mã này sẽ hết hạn sau 10 phút.`);

        return res.status(201).json({ message: "Đăng ký thành công, vui lòng kiểm tra email để xác thực" });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const { email, code } = req.body;
        const record = await EmailVerification.findOne({ email });
        if (!record)
            return res.status(400).json({ message: ErrorMessages.VERIFICATION_CODE_INVALID });

        if (record.expiredAt < new Date()) {
            await record.deleteOne();
            return res.status(400).json({ message: ErrorMessages.VERIFICATION_CODE_EXPIRED });
        }

        const isValid = await record.compareCode(code);
        if (!isValid)
            return res.status(400).json({ message: ErrorMessages.VERIFICATION_CODE_INVALID });

        await User.updateOne({ _id: record.userId }, { isVerified: true });

        await record.deleteOne();

        return res.json({ message: "Xác thực email thành công" });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: ErrorMessages.INVALID_CREDENTIALS });
        }
        if (!user.isVerified) {
            return res.status(400).json({ message: ErrorMessages.EMAIL_NOT_VERIFIED });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: ErrorMessages.INVALID_CREDENTIALS });
        }

        const token = jwt.sign({ id: user._id }, ENV.JWT_SECRET, {
            expiresIn: "7d",
        });

        const { password: _, ...userWithoutPassword } = user.toObject();

        return res.json({ token, user: userWithoutPassword });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};
