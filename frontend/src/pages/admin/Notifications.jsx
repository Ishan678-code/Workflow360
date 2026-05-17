import { useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { notificationsApi } from "../../services/api";

export default function AdminNotifications() {
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "GENERAL",
    targetRoles: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (role) => {
    setFormData(prev => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter(r => r !== role)
        : [...prev.targetRoles, role]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSuccess(false);

    const title = formData.title.trim();
    const body = formData.message.trim();

    if (!title || !body) {
      setMessage("Title and message are required.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const payload = {
        ...formData,
        title,
        message: body,
        targetRoles: formData.targetRoles.length > 0 ? formData.targetRoles : undefined, // Send undefined to target all
      };

      const response = await notificationsApi.broadcast(payload);
      setMessage(`Notification sent successfully to ${response.count} users!`);
      setIsSuccess(true);
      setFormData({
        title: "",
        message: "",
        type: "GENERAL",
        targetRoles: [],
      });
    } catch (error) {
      setMessage(error.message || "Failed to send notification");
      setIsSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const roles = [
    { value: "ADMIN", label: "Admins" },
    { value: "MANAGER", label: "Managers" },
    { value: "EMPLOYEE", label: "Employees" },
    { value: "FREELANCER", label: "Freelancers" },
  ];
  const audienceLabel = formData.targetRoles.length
    ? roles
        .filter((role) => formData.targetRoles.includes(role.value))
        .map((role) => role.label)
        .join(", ")
    : "All active users";

  return (
    <AdminLayout>
      <div className="space-y-8">
        <section className="overflow-hidden rounded-[34px] border border-slate-100 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">Send Notifications</h1>
              <p className="mt-2 text-sm text-slate-500">
                Broadcast important announcements to all users or specific roles.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    placeholder="Notification title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Type
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="GENERAL">General</option>
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="ALERT">Alert</option>
                    <option value="UPDATE">Update</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Message
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="Notification message"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">
                  Target Roles
                </label>
                <p className="mb-3 text-sm text-slate-500">
                  Current audience: <span className="font-semibold text-slate-700">{audienceLabel}</span>
                </p>
                <div className="flex flex-wrap gap-3">
                  {roles.map(role => (
                    <label key={role.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.targetRoles.includes(role.value)}
                        onChange={() => handleRoleChange(role.value)}
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-sm text-slate-600">{role.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {message && (
                <div className={`rounded-xl p-4 text-sm font-medium ${
                  isSuccess
                    ? "border border-green-200 bg-green-50 text-green-800"
                    : "border border-red-200 bg-red-50 text-red-800"
                }`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-rose-100 transition-all hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isSubmitting ? "Sending..." : "Send Notification"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
