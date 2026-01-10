import express from "express";
import { protect } from "../middlewares/authMiddleware";
import { chatRateLimiter } from "../middlewares/rateLimiter";
import { sendMessage, getChatHistory, sendFeedback } from "../controllers/chatController";

const router = express.Router();
router.use(protect);

router.post("/", chatRateLimiter, sendMessage);
router.get("/history", getChatHistory);
router.patch("/:id/feedback", sendFeedback);

export default router;
