import express from "express";
import { protect } from "../middlewares/authMiddleware";
import { createBudget, getBudgets, updateBudget, deleteBudget, getBudgetStatus } from "../controllers/budgetController";

const router = express.Router();
router.use(protect);

router.post("/", createBudget);
router.get("/", getBudgets);
router.get("/status", getBudgetStatus);
router.put("/:id", updateBudget);
router.delete("/:id", deleteBudget);

export default router;
