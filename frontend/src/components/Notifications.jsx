import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { io } from "socket.io-client";
import { notificationsApi } from "../services/api";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export default function Notifications() {
  const user = useMemo(getStoredUser, []);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    let canceled = false;
    setLoading(true);

    notificationsApi
      .getNotifications()
      .then((data) => {
        if (!canceled) {
          setNotifications(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!canceled) setNotifications([]);
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;

    const socket = io(BACKEND_URL, {
      path: "/socket.io",
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      socket.emit("join", user.id);
    });

    socket.on("notification", (notification) => {
      setNotifications((prev) => [notification, ...(prev || [])]);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const handleToggle = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen && unreadCount > 0) {
      try {
        await notificationsApi.markAllRead();
        setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      } catch {
        // ignore failures here
      }
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        title="View notifications"
        className="relative p-2 text-slate-400 hover:text-slate-900 transition-colors"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-96 max-h-96 overflow-hidden overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-xs text-slate-500">Recent updates and alerts</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-1 p-3">
            {loading && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Loading notifications...
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No notifications yet.
              </div>
            )}

            {!loading && notifications.map((notification) => (
              <div
                key={notification._id}
                className={`rounded-3xl border p-4 transition ${notification.isRead ? "border-slate-200 bg-white" : "border-rose-200 bg-rose-50/70"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{notification.message}</p>
                  </div>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <Check size={14} />
                  </span>
                </div>
                <p className="mt-2 text-[11px] uppercase tracking-[0.15em] text-slate-400">
                  {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : "Just now"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
