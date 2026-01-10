import express from "express";
import { protect } from "../middlewares/authMiddleware";
import { createBudget, getBudgets, updateBudget, deleteBudget } from "../controllers/budgetController";

const router = express.Router();
router.use(protect);

router.post("/", createBudget);
router.get("/", getBudgets);
router.put("/:id", updateBudget);
router.delete("/:id", deleteBudget);

export default router;
