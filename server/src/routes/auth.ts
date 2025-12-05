import { Router } from "express";
import { register, login, getMe, authMiddleware, AuthRequest } from "../auth/index.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getMe as any);

export default router;

