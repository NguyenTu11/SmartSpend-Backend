import nodemailer from "nodemailer";
import { ENV } from "../config/env";

const createTransporter = () => {
    return nodemailer.createTransport({
        host: ENV.EMAIL.HOST,
        port: ENV.EMAIL.PORT,
        secure: false,
        auth: {
            user: ENV.EMAIL.USER,
            pass: ENV.EMAIL.PASS
        }
    });
};

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VIMO</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 32px 24px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">VIMO</h1>
                            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Quản lý tài chính thông minh</p>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 24px;">
                            ${content}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">© 2026 VIMO. All rights reserved.</p>
                            <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px;">Bạn nhận được email này vì đã đăng ký tài khoản VIMO.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

const verificationTemplate = (code: string) => baseTemplate(`
    <div style="text-align: center;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 24px;">
            <tr>
                <td style="width: 64px; height: 64px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 50%; text-align: center; vertical-align: middle;">
                    <span style="font-size: 28px; line-height: 64px;">✉️</span>
                </td>
            </tr>
        </table>
        <h2 style="margin: 0 0 8px; color: #111827; font-size: 22px; font-weight: 600;">Xác thực email của bạn</h2>
        <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6;">
            Cảm ơn bạn đã đăng ký VIMO! Vui lòng sử dụng mã bên dưới để xác thực email.
        </p>
        <div style="background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Mã xác thực</p>
            <p style="margin: 0; color: #3b82f6; font-size: 36px; font-weight: 700; letter-spacing: 8px;">${code}</p>
        </div>
        <p style="margin: 0; color: #9ca3af; font-size: 13px;">⏱️ Mã này sẽ hết hạn sau <strong>10 phút</strong></p>
    </div>
`);

const passwordResetTemplate = (code: string) => baseTemplate(`
    <div style="text-align: center;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 24px;">
            <tr>
                <td style="width: 64px; height: 64px; background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); border-radius: 50%; text-align: center; vertical-align: middle;">
                    <span style="font-size: 28px; line-height: 64px;">🔐</span>
                </td>
            </tr>
        </table>
        <h2 style="margin: 0 0 8px; color: #111827; font-size: 22px; font-weight: 600;">Đặt lại mật khẩu</h2>
        <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6;">
            Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản VIMO. Sử dụng mã bên dưới để tiếp tục.
        </p>
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fee2e2 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Mã xác nhận</p>
            <p style="margin: 0; color: #f59e0b; font-size: 36px; font-weight: 700; letter-spacing: 8px;">${code}</p>
        </div>
        <p style="margin: 0 0 16px; color: #9ca3af; font-size: 13px;">⏱️ Mã này sẽ hết hạn sau <strong>10 phút</strong></p>
        <div style="background-color: #fef2f2; border-radius: 8px; padding: 12px; border-left: 4px solid #ef4444;">
            <p style="margin: 0; color: #b91c1c; font-size: 12px;">⚠️ Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        </div>
    </div>
`);

export const sendVerificationEmail = async (to: string, code: string) => {
    const transporter = createTransporter();
    await transporter.sendMail({
        from: `"VIMO" <${ENV.EMAIL.USER}>`,
        to,
        subject: "🔐 Mã xác thực VIMO",
        html: verificationTemplate(code)
    });
};

export const sendPasswordResetEmail = async (to: string, code: string) => {
    const transporter = createTransporter();
    await transporter.sendMail({
        from: `"VIMO" <${ENV.EMAIL.USER}>`,
        to,
        subject: "🔑 Đặt lại mật khẩu VIMO",
        html: passwordResetTemplate(code)
    });
};

export const sendEmail = async (to: string, subject: string, text: string) => {
    const transporter = createTransporter();
    await transporter.sendMail({
        from: `"VIMO" <${ENV.EMAIL.USER}>`,
        to,
        subject,
        text
    });
};
