import express from "express";
import { createCategory, getCategories, updateCategory, deleteCategory } from "../controllers/categoryController";
import { protect } from "../middlewares/authMiddleware";

const router = express.Router();
router.use(protect);

router.post("/", createCategory);
router.get("/", getCategories);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;