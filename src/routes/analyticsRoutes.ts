import express from "express";
import { getAnalyticsByTime, getWeeklyAnalytics, getYearlyAnalytics } from "../controllers/analyticsController";
import { protect } from "../middlewares/authMiddleware";

const router = express.Router();
router.use(protect);

router.get("/by-time", getAnalyticsByTime);
router.get("/weekly", getWeeklyAnalytics);
router.get("/yearly", getYearlyAnalytics);

export default router;
