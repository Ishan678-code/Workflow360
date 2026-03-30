const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

async function requestBlob(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Request failed");
  }

  return res.blob();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (payload) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  getMe: () => request("/auth/me"),
};

// ── Attendance ────────────────────────────────────────────────────────────────
export const attendanceApi = {
  clockIn: (terminalId = "WEB") =>
    request("/attendance/clock-in", { method: "POST", body: JSON.stringify({ terminalId }) }),
  clockOut: (terminalId = "WEB") =>
    request("/attendance/clock-out", { method: "PUT", body: JSON.stringify({ terminalId }) }),
  getMyAttendance: (from, to) => {
    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    return request(`/attendance/my?${params}`);
  },
  getAll: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return request(`/attendance?${params}`);
  },
  getSummary: (employeeId, month, year) => {
    const params = new URLSearchParams({ month, year });
    return request(`/attendance/summary/${employeeId}?${params}`);
  },
};

// ── Leaves ────────────────────────────────────────────────────────────────────
export const leaveApi = {
  apply: (payload) =>
    request("/leaves", { method: "POST", body: JSON.stringify(payload) }),
  getMyLeaves: () => request("/leaves/my"),
  getAll: (status) => {
    const params = status ? `?status=${status}` : "";
    return request(`/leaves${params}`);
  },
  approve: (id, comment) =>
    request(`/leaves/${id}/approve`, { method: "PUT", body: JSON.stringify({ comment }) }),
  reject: (id, comment) =>
    request(`/leaves/${id}/reject`, { method: "PUT", body: JSON.stringify({ comment }) }),
};

// ── Employees ─────────────────────────────────────────────────────────────────
export const employeeApi = {
  create: (payload) =>
    request("/employees", { method: "POST", body: JSON.stringify(payload) }),
  getAll: () => request("/employees"),
  getById: (id) => request(`/employees/${id}`),
  update: (id, payload) =>
    request(`/employees/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deactivate: (id) =>
    request(`/employees/${id}/deactivate`, { method: "PUT" }),
};

// ── Freelancers ───────────────────────────────────────────────────────────────
export const freelancerApi = {
  create: (payload) =>
    request("/freelancers", { method: "POST", body: JSON.stringify(payload) }),
  getAll: () => request("/freelancers"),
  getById: (id) => request(`/freelancers/${id}`),
  update: (id, payload) =>
    request(`/freelancers/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  delete: (id) => request(`/freelancers/${id}`, { method: "DELETE" }),
  match: (payload) =>
    request("/freelancers/match", { method: "POST", body: JSON.stringify(payload) }),
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const taskApi = {
  create: (payload) =>
    request("/tasks", { method: "POST", body: JSON.stringify(payload) }),
  getByProject: (projectId, filters = {}) => {
    const params = new URLSearchParams(filters);
    return request(`/tasks/project/${projectId}?${params}`);
  },
  getMyTasks: () => request("/tasks/my"),
  getPrioritized: () => request("/tasks/prioritized"),
  updateStatus: (id, status) =>
    request(`/tasks/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  update: (id, payload) =>
    request(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  delete: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
};

// ── Projects ──────────────────────────────────────────────────────────────────
export const projectApi = {
  create: (payload) =>
    request("/projects", { method: "POST", body: JSON.stringify(payload) }),
  getAll: () => request("/projects"),
  getById: (id) => request(`/projects/${id}`),
  update: (id, payload) =>
    request(`/projects/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  delete: (id) => request(`/projects/${id}`, { method: "DELETE" }),
};

// ── Timesheets ────────────────────────────────────────────────────────────────
export const timesheetApi = {
  log: (payload) =>
    request("/timesheets", { method: "POST", body: JSON.stringify(payload) }),
  getMine: (projectId) => {
    const params = projectId ? `?projectId=${projectId}` : "";
    return request(`/timesheets/my${params}`);
  },
  getAll: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return request(`/timesheets?${params}`);
  },
  approve: (id) =>
    request(`/timesheets/${id}/approve`, { method: "PUT" }),
};

// ── Invoices ──────────────────────────────────────────────────────────────────
export const invoiceApi = {
  generate: (freelancerId, projectId) =>
    request("/invoices/generate", { method: "POST", body: JSON.stringify({ freelancerId, projectId }) }),
  getAll: (status) => {
    const params = status ? `?status=${status}` : "";
    return request(`/invoices${params}`);
  },
  getById: (id) => request(`/invoices/${id}`),
  updateStatus: (id, status) =>
    request(`/invoices/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
};

// ── Payroll ───────────────────────────────────────────────────────────────────
export const payrollApi = {
  generate: (employeeId, month) =>
    request("/payroll/generate", { method: "POST", body: JSON.stringify({ employeeId, month }) }),
  generateBulk: (month) =>
    request("/payroll/generate-bulk", { method: "POST", body: JSON.stringify({ month }) }),
  getAll: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return request(`/payroll?${params}`);
  },
  getMine: () => request("/payroll/my"),
  getById: (id) => request(`/payroll/${id}`),
  downloadPayslip: (id) => requestBlob(`/payroll/${id}/payslip`),
};

// ── Performance Reviews ───────────────────────────────────────────────────────
export const performanceApi = {
  create: (payload) =>
    request("/performance-reviews", { method: "POST", body: JSON.stringify(payload) }),
  getAll: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return request(`/performance-reviews?${params}`);
  },
  getMine: () => request("/performance-reviews/my"),
  getSummary: (userId) => request(`/performance-reviews/summary/${userId}`),
  update: (id, payload) =>
    request(`/performance-reviews/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  delete: (id) => request(`/performance-reviews/${id}`, { method: "DELETE" }),
};

// ── Departments ───────────────────────────────────────────────────────────────
export const departmentApi = {
  getAll: () => request("/departments"),
  getById: (id) => request(`/departments/${id}`),
  create: (payload) =>
    request("/departments", { method: "POST", body: JSON.stringify(payload) }),
  update: (id, payload) =>
    request(`/departments/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
};

// ── Roles ─────────────────────────────────────────────────────────────────────
export const roleApi = {
  getAll: () => request("/roles"),
  create: (payload) =>
    request("/roles", { method: "POST", body: JSON.stringify(payload) }),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  getDashboard: () => request("/analytics/dashboard"),
  getPerformance: () => request("/analytics/performance"),
  getProductivity: (userId, period) => {
    const params = new URLSearchParams();
    if (period) params.append("period", period);
    return request(`/analytics/productivity/${userId}${params.toString() ? `?${params}` : ""}`);
  },
  getTeamPerformance: (period) => {
    const params = new URLSearchParams();
    if (period) params.append("period", period);
    return request(`/analytics/team-performance${params.toString() ? `?${params}` : ""}`);
  },
  downloadPerformanceReport: (userId, period) => {
    const params = period ? `?period=${period}` : "";
    return requestBlob(`/analytics/report/performance/${userId}${params}`);
  },
};

export { BASE_URL };
