import { Request, Response } from "express";
import { User } from "../models/User";
import { EmailVerification } from "../models/EmailVerification";
import { PasswordReset } from "../models/PasswordReset";
import { Category } from "../models/Category";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/emailService";
import { ENV } from "../config/env";
import { ErrorMessages } from "../utils/errorMessages";
import jwt from "jsonwebtoken";
import { generateRandomCode } from "../utils/random";

const DEFAULT_CATEGORIES = [
    { name: "Ăn uống", type: "expense" as const, keywords: ["ăn", "uống", "nhà hàng", "quán", "cafe", "cà phê", "bún", "phở", "cơm", "bánh"] },
    { name: "Di chuyển", type: "expense" as const, keywords: ["grab", "taxi", "xăng", "xe", "bus", "metro", "gojek", "be"] },
    { name: "Mua sắm", type: "expense" as const, keywords: ["mua", "shopping", "quần áo", "giày", "túi", "thời trang"] },
    { name: "Giải trí", type: "expense" as const, keywords: ["phim", "game", "nhạc", "show", "concert", "du lịch", "netflix", "spotify"] },
    { name: "Hóa đơn", type: "expense" as const, keywords: ["điện", "nước", "internet", "wifi", "điện thoại", "thuê", "nhà"] },
    { name: "Sức khỏe", type: "expense" as const, keywords: ["thuốc", "bệnh viện", "khám", "bác sĩ", "phòng khám", "y tế"] },
    { name: "Giáo dục", type: "expense" as const, keywords: ["học", "sách", "khóa học", "trường", "đại học", "tiếng anh"] },
    { name: "Khác", type: "expense" as const, keywords: [] },
    { name: "Lương", type: "income" as const, keywords: ["lương", "salary", "thưởng", "bonus"] },
    { name: "Đầu tư", type: "income" as const, keywords: ["cổ phiếu", "crypto", "lãi", "đầu tư", "tiết kiệm"] },
    { name: "Quà tặng", type: "income" as const, keywords: ["quà", "tặng", "lì xì", "gift"] },
    { name: "Thu nhập khác", type: "income" as const, keywords: [] }
];

const createDefaultCategories = async (userId: string) => {
    const existing = await Category.findOne({ userId });
    if (existing) return;

    const categories = DEFAULT_CATEGORIES.map(cat => ({
        userId,
        name: cat.name,
        type: cat.type,
        keywords: cat.keywords
    }));
    await Category.insertMany(categories);
};

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

        await sendVerificationEmail(user.email, code);

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

        await createDefaultCategories(record.userId.toString());

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

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email là bắt buộc" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ message: "Nếu email tồn tại, bạn sẽ nhận được mã xác nhận" });
        }

        await PasswordReset.deleteMany({ email });

        const code = generateRandomCode();
        const expire = new Date();
        expire.setMinutes(expire.getMinutes() + 10);

        const resetRecord = new PasswordReset({
            userId: user._id,
            email: user.email,
            codeHash: code,
            expiredAt: expire
        });
        await resetRecord.save();

        await sendPasswordResetEmail(user.email, code);

        return res.json({ message: "Nếu email tồn tại, bạn sẽ nhận được mã xác nhận" });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
        }

        const record = await PasswordReset.findOne({ email });
        if (!record) {
            return res.status(400).json({ message: "Mã xác nhận không hợp lệ" });
        }

        if (record.expiredAt < new Date()) {
            await record.deleteOne();
            return res.status(400).json({ message: "Mã xác nhận đã hết hạn" });
        }

        const isValid = await record.compareCode(code);
        if (!isValid) {
            return res.status(400).json({ message: "Mã xác nhận không hợp lệ" });
        }

        const user = await User.findById(record.userId);
        if (!user) {
            return res.status(400).json({ message: "Không tìm thấy tài khoản" });
        }

        user.password = newPassword;
        await user.save();

        await record.deleteOne();

        return res.json({ message: "Đặt lại mật khẩu thành công" });
    } catch (err: any) {
        return res.status(500).json({ message: ErrorMessages.SERVER_ERROR });
    }
};

export const googleLogin = async (req: Request, res: Response) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ message: "Google credential is required" });
        }

        let googleUser;
        try {
            googleUser = JSON.parse(credential);
        } catch {
            return res.status(400).json({ message: "Invalid credential format" });
        }

        const { sub: googleId, email, name, picture } = googleUser;

        if (!email) {
            return res.status(400).json({ message: "Email is required from Google" });
        }

        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        if (!user) {
            user = new User({
                googleId,
                email,
                name: name || email.split("@")[0],
                isVerified: true,
                avatar: picture ? { url: picture, publicId: "" } : undefined
            });
            await user.save();
            await createDefaultCategories(user._id.toString());
        } else if (!user.googleId) {
            user.googleId = googleId;
            user.isVerified = true;
            if (picture && !user.avatar?.url) {
                user.avatar = { url: picture, publicId: "" };
            }
            await user.save();
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
