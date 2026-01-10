import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";
import { ENV } from "../config/env";

cloudinary.config({
    cloud_name: ENV.CLOUDINARY.CLOUD_NAME,
    api_key: ENV.CLOUDINARY.API_KEY,
    api_secret: ENV.CLOUDINARY.API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "SmartSpend",
        allowed_formats: ["jpg", "jpeg", "png", "pdf"],
        transformation: [{ width: 800, height: 800, crop: "limit" }],
    } as any,
});

export const upload = multer({ storage });