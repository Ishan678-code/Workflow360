import { useEffect, useState } from "react";
import ManagerLayout from "../../layouts/ManagerLayout";
import { employeeApi } from "../../services/api";
import { getInitials } from "../../utils/formatters";

const fallbackEmployees = [
  { _id: "emp-1", name: "Ava Wilson", department: "Engineering", role: "Frontend Engineer", employmentStatus: "ACTIVE" },
  { _id: "emp-2", name: "Noah Carter", department: "Design", role: "Product Designer", employmentStatus: "ACTIVE" },
  { _id: "emp-3", name: "Emma Brooks", department: "Operations", role: "Coordinator", employmentStatus: "ONBOARDING" },
];

function normalizeEmployee(employee) {
  return {
    ...employee,
    name: employee.name || employee.userId?.name || "Team Member",
    email: employee.email || employee.userId?.email || "",
    role: employee.role || employee.designation?.title || employee.designation || "Contributor",
    department: employee.department?.name || employee.department || "General",
    status: employee.employmentStatus || employee.status || (employee.userId?.isActive === false ? "INACTIVE" : "ACTIVE"),
  };
}

export default function ManagerEmployees() {
  const [employees, setEmployees] = useState(fallbackEmployees);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadEmployees() {
      try {
        const data = await employeeApi.getAll();
        if (!active) return;
        const rows = Array.isArray(data) ? data : data?.data || fallbackEmployees;
        setEmployees(rows.map(normalizeEmployee));
      } catch (err) {
        if (active) setError(err.message || "Unable to load employees.");
      }
    }

    loadEmployees();
    return () => {
      active = false;
    };
  }, []);

  return (
    <ManagerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Employees</h1>
          <p className="mt-2 text-sm text-slate-500">A quick view of who is active, where they sit, and what they own.</p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {error} Showing sample roster data for now.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {employees.map((employee) => (
            <article key={employee._id || employee.email || employee.name} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-sm font-black text-violet-700">
                  {getInitials(employee.name)}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-black text-slate-900">{employee.name || "Team Member"}</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">{employee.role}</p>
                </div>
              </div>
              <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Department</span>
                  <span className="font-semibold text-slate-800">{employee.department}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Status</span>
                  <span className="font-semibold text-violet-700">{employee.status}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </ManagerLayout>
  );
}
