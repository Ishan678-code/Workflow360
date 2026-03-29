import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { departmentApi, employeeApi, freelancerApi } from "../../services/api";
import { getInitials } from "../../utils/formatters";

const MANUAL_EMPLOYEES_STORAGE_KEY = "admin_people_manual_employees";
const MANUAL_DEPARTMENTS_STORAGE_KEY = "admin_people_manual_departments";

function normalizeEmployee(person) {
  return {
    ...person,
    name: person.name || person.userId?.name || "Unnamed",
    email: person.email || person.userId?.email || "No email",
    role: person.role || person.designation?.title || person.designation || "Employee",
    departmentName: person.department?.name || "Unassigned",
    managerName: person.manager?.name || person.manager?.email || "No manager",
  };
}

function normalizeFreelancer(person) {
  return {
    ...person,
    name: person.name || person.userId?.name || "Unnamed",
    email: person.email || person.userId?.email || "No email",
    role: person.role || person.skills?.join(", ") || "Freelancer",
  };
}

const defaultDepartmentOptions = [
  { _id: "default-backend", name: "Backend Department" },
  { _id: "default-frontend", name: "Frontend Department" },
  { _id: "default-fullstack", name: "Full Stack Department" },
  { _id: "default-mobile", name: "Mobile App Department" },
  { _id: "default-devops", name: "DevOps Department" },
  { _id: "default-qa", name: "QA Department" },
  { _id: "default-uiux", name: "UI/UX Department" },
  { _id: "default-product", name: "Product Department" },
  { _id: "default-hr", name: "HR Department" },
  { _id: "default-finance", name: "Finance Department" },
  { _id: "default-operations", name: "Operations Department" },
  { _id: "default-support", name: "IT Support Department" },
];

const roleOptions = [
  "Backend Developer",
  "Frontend Developer",
  "Full Stack Developer",
  "Mobile Developer",
  "UI/UX Designer",
  "QA Engineer",
  "DevOps Engineer",
  "HR Executive",
  "Product Manager",
  "Project Manager",
  "Business Analyst",
  "Finance Executive",
  "Operations Executive",
  "Support Engineer",
];

function readManualEmployees() {
  try {
    const stored = localStorage.getItem(MANUAL_EMPLOYEES_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readManualDepartments() {
  try {
    const stored = localStorage.getItem(MANUAL_DEPARTMENTS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeEmployees(baseEmployees, manualEmployees) {
  const merged = new Map();

  baseEmployees.forEach((employee) => {
    const key = String(employee.email || employee._id || "").trim().toLowerCase();
    merged.set(key, employee);
  });

  manualEmployees.forEach((employee) => {
    const key = String(employee.email || employee._id || "").trim().toLowerCase();
    merged.set(key, employee);
  });

  return Array.from(merged.values());
}

export default function AdminPeople() {
  const [employees, setEmployees] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [manualEmployees, setManualEmployees] = useState(() => readManualEmployees());
  const [manualDepartments, setManualDepartments] = useState(() => readManualDepartments());
  const [error, setError] = useState("");
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [assignment, setAssignment] = useState({
    employeeId: "",
    employeeName: "",
    employeeEmail: "",
    employeeRole: "",
    departmentId: "",
  });
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [assignmentNotice, setAssignmentNotice] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPeople() {
      const [employeeRes, freelancerRes, departmentRes] = await Promise.allSettled([
        employeeApi.getAll(),
        freelancerApi.getAll(),
        departmentApi.getAll(),
      ]);

      if (!active) return;

      const employeeList =
        employeeRes.status === "fulfilled"
          ? Array.isArray(employeeRes.value)
            ? employeeRes.value
            : employeeRes.value?.data || []
          : [];
      const freelancerList =
        freelancerRes.status === "fulfilled"
          ? Array.isArray(freelancerRes.value)
            ? freelancerRes.value
            : freelancerRes.value?.data || []
          : [];
      const departmentList =
        departmentRes.status === "fulfilled"
          ? Array.isArray(departmentRes.value)
            ? departmentRes.value
            : departmentRes.value?.data || []
          : [];

      if (employeeRes.status === "rejected" && freelancerRes.status === "rejected" && departmentRes.status === "rejected") {
        setError("Unable to load people data right now.");
      }

      setEmployees(mergeEmployees(employeeList.map(normalizeEmployee), manualEmployees));
      setFreelancers(freelancerList.map(normalizeFreelancer));
      setDepartments(departmentList);
    }

    loadPeople().catch(() => {
      if (active) setError("Unable to load people data right now.");
    });

    return () => {
      active = false;
    };
  }, [manualEmployees]);

  useEffect(() => {
    localStorage.setItem(MANUAL_EMPLOYEES_STORAGE_KEY, JSON.stringify(manualEmployees));
  }, [manualEmployees]);

  useEffect(() => {
    localStorage.setItem(MANUAL_DEPARTMENTS_STORAGE_KEY, JSON.stringify(manualDepartments));
  }, [manualDepartments]);

  const selectedEmployee = employees.find((employee) => {
    if (assignment.employeeId) {
      return employee._id === assignment.employeeId;
    }

    const normalizedName = assignment.employeeName.trim().toLowerCase();
    const normalizedEmail = assignment.employeeEmail.trim().toLowerCase();
    const normalizedRole = assignment.employeeRole.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !normalizedRole) {
      return false;
    }

    return String(employee.name || "").trim().toLowerCase() === normalizedName
      && String(employee.email || "").trim().toLowerCase() === normalizedEmail
      && String(employee.role || "").trim().toLowerCase() === normalizedRole;
  });

  const departmentOptions = [
    ...departments,
    ...manualDepartments.filter(
      (manualDepartment) =>
        !departments.some(
          (department) =>
            String(department.name || "").trim().toLowerCase() === manualDepartment.name.toLowerCase()
        )
    ),
    ...defaultDepartmentOptions.filter(
      (defaultDepartment) =>
        ![...departments, ...manualDepartments].some(
          (department) =>
            String(department.name || "").trim().toLowerCase() === defaultDepartment.name.toLowerCase()
        )
    ),
  ];

  const displayedDepartments = departmentOptions.map((department) => {
    const employeeCount = employees.filter(
      (employee) =>
        String(employee.departmentName || "").trim().toLowerCase() === String(department.name || "").trim().toLowerCase()
    ).length;
    const freelancerCount = Number(department.freelancerCount || 0);

    return {
      ...department,
      headcount: employeeCount,
      employeeCount,
      freelancerCount,
      location: department.location || "Kathmandu HQ",
    };
  });

  async function refreshPeople() {
    const [employeeRes, freelancerRes, departmentRes] = await Promise.allSettled([
      employeeApi.getAll(),
      freelancerApi.getAll(),
      departmentApi.getAll(),
    ]);

    const employeeList =
      employeeRes.status === "fulfilled"
        ? Array.isArray(employeeRes.value)
          ? employeeRes.value
          : employeeRes.value?.data || []
        : [];
    const freelancerList =
      freelancerRes.status === "fulfilled"
        ? Array.isArray(freelancerRes.value)
          ? freelancerRes.value
          : freelancerRes.value?.data || []
        : [];
    const departmentList =
      departmentRes.status === "fulfilled"
        ? Array.isArray(departmentRes.value)
          ? departmentRes.value
          : departmentRes.value?.data || []
        : [];

    setEmployees(mergeEmployees(employeeList.map(normalizeEmployee), manualEmployees));
    setFreelancers(freelancerList.map(normalizeFreelancer));
    setDepartments(departmentList);
  }

  function handleEmployeeSelection(employeeId) {
    const employee = employees.find((person) => person._id === employeeId);
    setAssignment({
      employeeId,
      employeeName: employee?.name || "",
      employeeEmail: employee?.email || "",
      employeeRole: employee?.role || "",
      departmentId: employee?.department?._id || "",
    });
    setAssignmentNotice("");
  }

  function openDepartmentModal(employeeId = "") {
    if (employeeId) {
      handleEmployeeSelection(employeeId);
    } else {
      setAssignment({
        employeeId: "",
        employeeName: "",
        employeeEmail: "",
        employeeRole: "",
        departmentId: "",
      });
      setAssignmentNotice("");
    }
    setIsDepartmentModalOpen(true);
  }

  function closeDepartmentModal() {
    if (isSavingAssignment) return;
    setIsDepartmentModalOpen(false);
    setAssignmentNotice("");
  }

  async function handleDepartmentSubmit(event) {
    event.preventDefault();

    const normalizedName = assignment.employeeName.trim().toLowerCase();
    const normalizedEmail = assignment.employeeEmail.trim().toLowerCase();
    const normalizedRole = assignment.employeeRole.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !normalizedRole) {
      setAssignmentNotice("Enter the employee name, email, and role first.");
      return;
    }

    setIsSavingAssignment(true);
    setAssignmentNotice("");

    try {
      const selectedDepartment = departmentOptions.find(
        (department) => department._id === assignment.departmentId
      );
      const manualEmployee = {
        _id: assignment.employeeId || `manual-${Date.now()}`,
        name: assignment.employeeName.trim(),
        email: assignment.employeeEmail.trim(),
        role: assignment.employeeRole.trim(),
        departmentName: selectedDepartment?.name || "Unassigned",
        department: selectedDepartment
          ? { _id: selectedDepartment._id, name: selectedDepartment.name }
          : null,
        managerName: selectedEmployee?.managerName || "No manager",
      };

      setManualEmployees((current) => {
        const next = [...current];
        const existingIndex = next.findIndex(
          (employee) => String(employee.email || "").trim().toLowerCase() === normalizedEmail
        );

        if (existingIndex >= 0) {
          next[existingIndex] = { ...next[existingIndex], ...manualEmployee };
        } else {
          next.unshift(manualEmployee);
        }

        return next;
      });

      if (selectedDepartment) {
        setManualDepartments((current) => {
          const exists = current.some(
            (department) =>
              String(department.name || "").trim().toLowerCase() === String(selectedDepartment.name || "").trim().toLowerCase()
          );

          if (exists || departments.some(
            (department) =>
              String(department.name || "").trim().toLowerCase() === String(selectedDepartment.name || "").trim().toLowerCase()
          )) {
            return current;
          }

          return [
            ...current,
            {
              _id: selectedDepartment._id,
              name: selectedDepartment.name,
              code: selectedDepartment.code || selectedDepartment.name.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() || "DEPT",
              head: null,
              parentDepartment: null,
              divisionCount: 0,
              location: "Kathmandu HQ",
            },
          ];
        });
      }

      setEmployees((current) => mergeEmployees(current, [manualEmployee]));
      setAssignmentNotice(
        manualEmployee.departmentName !== "Unassigned"
          ? `Department saved for ${manualEmployee.name}.`
          : `Department cleared for ${manualEmployee.name}.`
      );
      setTimeout(() => {
        setIsDepartmentModalOpen(false);
        setAssignmentNotice("");
      }, 700);
    } finally {
      setIsSavingAssignment(false);
    }
  }

  const sections = [
    { title: "Employees", items: employees, empty: "No employee records yet." },
    { title: "Freelancers", items: freelancers, empty: "No freelancer records yet." },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">People</h1>
          <p className="mt-2 text-sm text-slate-500">A combined roster across employees and freelancers.</p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => openDepartmentModal()}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Add Department
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {error}
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Department Structure</h2>
              <p className="mt-1 text-sm text-slate-500">Department-wise divisions, reporting heads, and team size.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
              {displayedDepartments.length} divisions
            </span>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {displayedDepartments.length ? displayedDepartments.map((department) => (
              <article key={department._id || department.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {department.code || "DEPT"}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-slate-900">{department.name}</h3>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                    {department.headcount || 0} people
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p>Manager: <span className="font-semibold text-slate-800">{department.head?.name || department.manager?.name || "Not assigned"}</span></p>
                  <p>No. of Employees: <span className="font-semibold text-slate-800">{department.employeeCount || 0}</span></p>
                  <p>No. of Freelancers: <span className="font-semibold text-slate-800">{department.freelancerCount || 0}</span></p>
                  <p>Location: <span className="font-semibold text-slate-800">{department.location || "Kathmandu HQ"}</span></p>
                </div>
              </article>
            )) : (
              <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                No departments available yet.
              </div>
            )}
          </div>
        </section>

        {sections.map((section) => (
          <section key={section.title} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">{section.title}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {section.items.length ? (
                section.items.map((person) => (
                  <article
                    key={person._id || person.email || person.name}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-xs font-black text-rose-700">
                        {getInitials(person.name)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-black text-slate-900">{person.name || "Unnamed"}</h3>
                        <p className="mt-1 truncate text-sm text-slate-500">{person.email || "No email"}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Role</span>
                      <span className="font-semibold text-slate-800">
                        {person.role}
                      </span>
                    </div>
                    {"departmentName" in person ? (
                      <>
                        <div className="mt-2 flex items-center justify-between text-sm">
                          <span className="text-slate-500">Department</span>
                          <span className="font-semibold text-slate-800">{person.departmentName}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm">
                          <span className="text-slate-500">Manager</span>
                          <span className="font-semibold text-slate-800">{person.managerName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openDepartmentModal(person._id)}
                          className="mt-4 rounded-full bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-rose-700 shadow-sm ring-1 ring-rose-100 transition hover:bg-rose-50"
                        >
                          Edit Department
                        </button>
                      </>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                  {section.empty}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>

      {isDepartmentModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-600">Department Assignment</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Add department details</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Choose the employee, assign the department, review the related details, and save the change.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDepartmentModal}
                className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500 transition hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleDepartmentSubmit} className="mt-6 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Name</span>
                  <input
                    type="text"
                    value={assignment.employeeName}
                    onChange={(event) => setAssignment((current) => ({ ...current, employeeId: "", employeeName: event.target.value }))}
                    placeholder="Enter employee name"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-rose-300 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Email</span>
                  <input
                    type="email"
                    value={assignment.employeeEmail}
                    onChange={(event) => setAssignment((current) => ({ ...current, employeeId: "", employeeEmail: event.target.value }))}
                    placeholder="Enter employee email"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-rose-300 focus:bg-white"
                  />
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Role</span>
                  <select
                    value={assignment.employeeRole}
                    onChange={(event) => setAssignment((current) => ({ ...current, employeeId: "", employeeRole: event.target.value }))}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                  >
                    <option value="">Select a role</option>
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Department</span>
                  <select
                    value={assignment.departmentId}
                    onChange={(event) => setAssignment((current) => ({ ...current, departmentId: event.target.value }))}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                  >
                    <option value="">Unassigned</option>
                    {departmentOptions.map((department) => (
                      <option key={department._id} value={department._id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 rounded-3xl bg-slate-50 p-5 md:grid-cols-2">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Employee Details</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p>Name: <span className="font-semibold text-slate-800">{selectedEmployee?.name || "Select an employee"}</span></p>
                    <p>Email: <span className="font-semibold text-slate-800">{selectedEmployee?.email || "No email"}</span></p>
                    <p>Role: <span className="font-semibold text-slate-800">{selectedEmployee?.role || "Employee"}</span></p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Related Details</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p>Current department: <span className="font-semibold text-slate-800">{selectedEmployee?.departmentName || "Unassigned"}</span></p>
                    <p>Manager: <span className="font-semibold text-slate-800">{selectedEmployee?.managerName || "No manager"}</span></p>
                    <p>Departments available: <span className="font-semibold text-slate-800">{departments.length}</span></p>
                  </div>
                </div>
              </div>

              {assignmentNotice ? (
                <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${assignmentNotice.toLowerCase().includes("enter") || assignmentNotice.toLowerCase().includes("select") || assignmentNotice.toLowerCase().includes("unable") || assignmentNotice.toLowerCase().includes("match") ? "border border-amber-200 bg-amber-50 text-amber-800" : "border border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                  {assignmentNotice}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDepartmentModal}
                  disabled={isSavingAssignment}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAssignment}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingAssignment ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
