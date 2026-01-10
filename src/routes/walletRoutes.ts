import express from "express";
import { protect } from "../middlewares/authMiddleware";
import { createWallet, getWallets, updateWallet, deleteWallet } from "../controllers/walletController";

const router = express.Router();
router.use(protect);

router.post("/", createWallet);
router.get("/", getWallets);
router.put("/:id", updateWallet);
router.delete("/:id", deleteWallet);

export default router;
