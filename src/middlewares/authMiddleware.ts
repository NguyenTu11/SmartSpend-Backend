import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ENV } from "../config/env";
import { User, IUser } from "../models/User";
import { ErrorMessages } from "../utils/errorMessages";
import mongoose from "mongoose";

export interface AuthRequest extends Request {
    user?: Partial<IUser> & { _id: mongoose.Types.ObjectId | string };
}

export const protect = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ message: ErrorMessages.NO_TOKEN });
            return;
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            res.status(401).json({ message: ErrorMessages.INVALID_TOKEN });
            return;
        }

        const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;

        if (!decoded || !decoded.id) {
            res.status(401).json({ message: ErrorMessages.INVALID_TOKEN });
            return;
        }

        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            res.status(401).json({ message: ErrorMessages.USER_NOT_FOUND });
            return;
        }

        req.user = {
            ...user.toObject(),
            _id: user._id,
        };

        next();
    } catch (err: any) {
        if (err.name === "TokenExpiredError") {
            res.status(401).json({ message: ErrorMessages.TOKEN_EXPIRED });
            return;
        }
        res.status(401).json({ message: ErrorMessages.INVALID_TOKEN });
    }
};
