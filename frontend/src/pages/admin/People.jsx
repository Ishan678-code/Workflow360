import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { employeeApi, freelancerApi } from "../../services/api";
import { getInitials } from "../../utils/formatters";

function normalizeEmployee(person) {
  return {
    ...person,
    name: person.name || person.userId?.name || "Unnamed",
    email: person.email || person.userId?.email || "No email",
    role: person.role || person.designation?.title || person.designation || "Employee",
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

export default function AdminPeople() {
  const [employees, setEmployees] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPeople() {
      const [employeeRes, freelancerRes] = await Promise.allSettled([
        employeeApi.getAll(),
        freelancerApi.getAll(),
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

      if (employeeRes.status === "rejected" && freelancerRes.status === "rejected") {
        setError("Unable to load people data right now.");
      }

      setEmployees(employeeList.map(normalizeEmployee));
      setFreelancers(freelancerList.map(normalizeFreelancer));
    }

    loadPeople().catch(() => {
      if (active) setError("Unable to load people data right now.");
    });

    return () => {
      active = false;
    };
  }, []);

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

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {error}
          </div>
        ) : null}

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
    </AdminLayout>
  );
}
