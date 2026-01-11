import express from "express";
import { getFinancialScore, getUserProfile, updateProfile, deleteAvatar, uploadAvatar } from "../controllers/userController";
import { protect } from "../middlewares/authMiddleware";
import { upload } from "../services/cloudinary";

const router = express.Router();
router.use(protect);

router.get("/profile", getUserProfile);
router.put("/profile", updateProfile);
router.post("/avatar", upload.single("avatar"), uploadAvatar);
router.delete("/avatar", deleteAvatar);
router.get("/financial-score", getFinancialScore);

export default router;
