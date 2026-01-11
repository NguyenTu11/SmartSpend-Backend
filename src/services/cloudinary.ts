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
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }],
    } as any,
});

export const upload = multer({ storage });

export const uploadBase64Image = async (
    base64Data: string,
    subfolder: string = "receipts"
): Promise<{ url: string; publicId: string }> => {
    const base64String = base64Data.includes("base64,")
        ? base64Data
        : `data:image/jpeg;base64,${base64Data}`;

    const result = await cloudinary.uploader.upload(base64String, {
        folder: `SmartSpend/${subfolder}`,
        resource_type: "image",
        transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }],
    });

    return {
        url: result.secure_url,
        publicId: result.public_id,
    };
};

export const deleteImage = async (publicId: string): Promise<boolean> => {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
};

export { cloudinary };