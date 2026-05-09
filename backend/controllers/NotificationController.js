import Notification from "../models/Notification.js";
import User from "../models/User.js";

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(30);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, isRead: false }, { isRead: true });
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createNotification = async (req, res) => {
  try {
    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }

    const { userId, title, message, type, metadata } = req.body;
    if (!userId || !title || !message) {
      return res.status(400).json({ message: "userId, title, and message are required" });
    }

    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type: type || "GENERAL",
      metadata: metadata || {},
    });

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const broadcastNotification = async (req, res) => {
  try {
    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }

    const { title, message, type, metadata, targetRoles } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: "title and message are required" });
    }

    // Get all active users, optionally filter by roles
    const query = { isActive: true };
    if (targetRoles && Array.isArray(targetRoles)) {
      query.role = { $in: targetRoles };
    }

    const users = await User.find(query).select('_id');
    if (users.length === 0) {
      return res.status(400).json({ message: "No users found to notify" });
    }

    const notifications = users.map(user => ({
      user: user._id,
      title,
      message,
      type: type || "GENERAL",
      metadata: metadata || {},
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    res.status(201).json({
      message: `Notification sent to ${createdNotifications.length} users`,
      count: createdNotifications.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
