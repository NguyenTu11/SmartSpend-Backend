import dotenv from "dotenv";
dotenv.config();

export const ENV = {
    PORT: process.env.PORT || 8000,
    MONGO_URI: process.env.MONGO_URI || "",
    JWT_SECRET: process.env.JWT_SECRET || "",

    CLOUDINARY: {
        CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
        API_KEY: process.env.CLOUDINARY_API_KEY || "",
        API_SECRET: process.env.CLOUDINARY_API_SECRET || ""
    },

    EMAIL: {
        HOST: process.env.EMAIL_HOST || "smtp.gmail.com",
        PORT: parseInt(process.env.EMAIL_PORT || "587"),
        USER: process.env.EMAIL_USER || "",
        PASSWORD: process.env.EMAIL_PASSWORD || "",
        FROM: process.env.EMAIL_FROM || "VIMO <noreply@vimo.com>"
    },

    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
    FRONTEND_URL: process.env.FRONTEND_URL || ""
};
