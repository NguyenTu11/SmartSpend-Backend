import express from "express";
import { createTransaction, getTransactions, getExpenseSummary, updateTransaction, deleteTransaction } from "../controllers/transactionController";
import { protect } from "../middlewares/authMiddleware";

const router = express.Router();
router.use(protect);

router.post("/", createTransaction);
router.get("/", getTransactions);
router.get("/summary", getExpenseSummary);
router.put("/:id", updateTransaction);
router.delete("/:id", deleteTransaction);

export default router;