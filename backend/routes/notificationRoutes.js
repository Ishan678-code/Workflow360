import express from "express";
import { verifyToken } from "../middleware/auth.js";
import {
  createNotification,
  getNotifications,
  markAllRead,
  markAsRead,
} from "../controllers/NotificationController.js";

const router = express.Router();

router.use(verifyToken);
router.get("/", getNotifications);
router.post("/", createNotification);
router.put("/read-all", markAllRead);
router.put("/:id/read", markAsRead);

export default router;
