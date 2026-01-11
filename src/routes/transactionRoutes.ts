import express from "express";
import { createTransaction, getTransactions, getExpenseSummary, updateTransaction, deleteTransaction, exportTransactions, uploadEvidence } from "../controllers/transactionController";
import { protect } from "../middlewares/authMiddleware";
import { upload } from "../services/cloudinary";

const router = express.Router();
router.use(protect);

router.post("/", createTransaction);
router.post("/upload-evidence", upload.single("evidence"), uploadEvidence);
router.get("/", getTransactions);
router.get("/summary", getExpenseSummary);
router.get("/export", exportTransactions);
router.put("/:id", updateTransaction);
router.delete("/:id", deleteTransaction);

export default router;