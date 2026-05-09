import Notification from "../models/Notification.js";
import { sendNotification } from "./socketService.js";

export async function createNotification(userId, title, message, type = "GENERAL", metadata = {}) {
  if (!userId) return null;

  const notification = await Notification.create({
    user: userId,
    title,
    message,
    type,
    metadata,
  });

  sendNotification(userId, {
    ...notification.toObject(),
    createdAt: notification.createdAt?.toISOString(),
  });

  return notification;
}
