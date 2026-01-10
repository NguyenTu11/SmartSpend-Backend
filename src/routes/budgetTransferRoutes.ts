import express from "express";
import { protect } from "../middlewares/authMiddleware";
import { createTransferRequest, respondToTransfer, getTransferHistory, getPendingTransfers } from "../controllers/budgetTransferController";

const router = express.Router();
router.use(protect);

router.post("/", createTransferRequest);
router.get("/", getTransferHistory);
router.get("/pending", getPendingTransfers);
router.put("/:id/respond", respondToTransfer);

export default router;
