import express from "express";
import { scanReceipt, scanReceiptFile, uploadReceiptImage } from "../controllers/ocrController";
import { protect } from "../middlewares/authMiddleware";
import { ocrRateLimiter } from "../middlewares/rateLimiter";
import { upload } from "../services/cloudinary";

const router = express.Router();
router.use(protect);

router.post("/scan", ocrRateLimiter, scanReceipt);
router.post("/scan-file", ocrRateLimiter, upload.single("receipt"), scanReceiptFile);
router.post("/upload", upload.single("receipt"), uploadReceiptImage);

export default router;
