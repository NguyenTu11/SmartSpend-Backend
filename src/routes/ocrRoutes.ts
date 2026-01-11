import express from "express";
import { scanReceipt, uploadReceiptImage } from "../controllers/ocrController";
import { protect } from "../middlewares/authMiddleware";
import { upload } from "../services/cloudinary";

const router = express.Router();
router.use(protect);

router.post("/scan", scanReceipt);
router.post("/upload", upload.single("receipt"), uploadReceiptImage);

export default router;
