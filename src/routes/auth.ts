import { Router } from "express";
import { register, verifyEmail, resendVerification, login, forgotPassword, resetPassword, googleLogin } from "../controllers/authController";

const router = Router();

router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/google", googleLogin);

export default router;
