import nodemailer from "nodemailer";
import { ENV } from "../config/env";

export const sendEmail = async (to: string, subject: string, text: string) => {
    const transporter = nodemailer.createTransport({
        host: ENV.EMAIL.HOST,
        port: ENV.EMAIL.PORT,
        secure: false,
        auth: {
            user: ENV.EMAIL.USER,
            pass: ENV.EMAIL.PASS
        }
    });

    await transporter.sendMail({
        from: ENV.EMAIL.USER,
        to,
        subject,
        text
    });
};
