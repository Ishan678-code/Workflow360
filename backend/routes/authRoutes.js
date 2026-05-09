import express from "express";
import { register, login, logout, getMe, checkEmail, resetPassword } from "../controllers/AuthController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", verifyToken, logout);
router.get("/me", verifyToken, getMe);
router.post("/check-email", checkEmail);
router.post("/reset-password", resetPassword);

export default router;