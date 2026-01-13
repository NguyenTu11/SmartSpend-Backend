import { Router } from "express";
import { protect } from "../middlewares/authMiddleware";
import { getDashboardInsights } from "../controllers/dashboardController";

const router = Router();

router.get("/insights", protect, getDashboardInsights);

export default router;
