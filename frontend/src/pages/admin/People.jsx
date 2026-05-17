import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { authApi, departmentApi, employeeApi, freelancerApi, projectApi } from "../../services/api";
import { getInitials } from "../../utils/formatters";

const SHOW_DEMO_PEOPLE_ON_API_FAILURE = false;

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

function makeEmployeeCode(name) {
  const initials = String(name)
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 3);
  return `${initials || "EMP"}-${Date.now().toString().slice(-4)}`;
}

const sampleEmployees = [
  {
    _id: "sample-emp-1",
    name: "Arun Shrestha",
    email: "arun.shrestha@workflow360.com",
    role: "Engineering Manager",
    departmentName: "Operations Department",
    managerName: "—",
  },

  {
    _id: "sample-emp-2",
    name: "Anita Poudel",
    email: "anita.poudel@workflow360.com",
    role: "Frontend Developer",
    departmentName: "Frontend Department",
    managerName: "Sanjay Karki",
  },
  {
    _id: "sample-emp-3",
    name: "Sunil Maharjan",
    email: "sunil.maharjan@workflow360.com",
    role: "Full Stack Developer",
    departmentName: "Full Stack Department",
    managerName: "Arun Shrestha",
  },
  {
    _id: "sample-emp-4",
    name: "Deepa Shrestha",
    email: "deepa.shrestha@workflow360.com",
    role: "HR Executive",
    departmentName: "HR Department",
    managerName: "Ramesh Bhandari",
  },
  {
    _id: "sample-emp-5",
    name: "Krishna Adhikari",
    email: "krishna.adhikari@workflow360.com",
    role: "DevOps Engineer",
    departmentName: "DevOps Department",
    managerName: "Sanjay Karki",
  },
  {
    _id: "sample-emp-6",
    name: "Nisha Bhandari",
    email: "nisha.bhandari@workflow360.com",
    role: "QA Engineer",
    departmentName: "QA Department",
    managerName: "Ramesh Bhandari",
  },
];

const sampleFreelancers = [
  {
    _id: "sample-fl-1",
    name: "Ramila Shrestha",
    email: "ramila.shrestha@freelance.io",
    role: "React, Node.js, MongoDB",
    skills: ["React", "Node.js", "MongoDB", "TypeScript"],
    hourlyRate: 35,
    departmentName: "Full Stack Department",
  },
  {
    _id: "sample-fl-2",
    name: "Gita Tamang",
    email: "gita.tamang@freelance.io",
    role: "UI/UX Design, Figma, Tailwind CSS",
    skills: ["Figma", "Tailwind CSS", "Adobe XD", "UI/UX Design"],
    hourlyRate: 28,
    departmentName: "UI/UX Department",
  },
  {
    _id: "sample-fl-3",
    name: "Rajan Gurung",
    email: "rajan.gurung@freelance.io",
    role: "Python, Django, PostgreSQL",
    skills: ["Python", "Django", "PostgreSQL", "REST APIs"],
    hourlyRate: 40,
    departmentName: "Backend Department",
  },
  {
    _id: "sample-fl-4",
    name: "Sita Karki",
    email: "sita.karki@freelance.io",
    role: "Flutter, Dart, Firebase",
    skills: ["Flutter", "Dart", "Firebase", "Android"],
    hourlyRate: 32,
    departmentName: "Mobile App Department",
  },
  {
    _id: "sample-fl-5",
    name: "Bikash Rai",
    email: "bikash.rai@freelance.io",
    role: "DevOps, Docker, AWS, CI/CD",
    skills: ["Docker", "AWS", "CI/CD", "Kubernetes"],
    hourlyRate: 50,
    departmentName: "DevOps Department",
  },
  {
    _id: "sample-fl-6",
    name: "Manisha Thapa",
    email: "manisha.thapa@freelance.io",
    role: "QA Testing, Selenium, Cypress",
    skills: ["QA Testing", "Selenium", "Cypress", "Jest"],
    hourlyRate: 25,
    departmentName: "QA Department",
  },
];

const statusColors = {
  Active: "bg-emerald-50 text-emerald-700",
  Inactive: "bg-slate-100 text-slate-600",
  "On Project": "bg-blue-50 text-blue-700",
};

const defaultDepartmentOptions = [
  { _id: "HR Department", name: "HR Department" },
  { _id: "Frontend Department", name: "Frontend Department" },
  { _id: "Backend Department", name: "Backend Department" },
  { _id: "Mobile App Department", name: "Mobile App Department" },
  { _id: "Design Department", name: "Design Department" },
  { _id: "UI/UX Department", name: "UI/UX Department" },
  { _id: "DevOps Department", name: "DevOps Department" },
  { _id: "QA Department", name: "QA Department" },
  { _id: "Product Department", name: "Product Department" },
  { _id: "Finance Department", name: "Finance Department" },
  { _id: "Operations Department", name: "Operations Department" },
];

export default function AdminPeople() {
  const [employees, setEmployees] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState([]);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [isAddDepartmentModalOpen, setIsAddDepartmentModalOpen] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newDepartmentNotice, setNewDepartmentNotice] = useState("");
  const [isSavingDepartment, setIsSavingDepartment] = useState(false);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [matchForm, setMatchForm] = useState({ projectId: "", description: "", requiredSkills: "" });
  const [matchResults, setMatchResults] = useState([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [assignment, setAssignment] = useState({
    employeeId: "",
    employeeName: "",
    employeeEmail: "",
    employeeRole: "",
    departmentId: "",
    managerId: "",
  });
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [assignmentNotice, setAssignmentNotice] = useState("");
  const [isAddPersonModalOpen, setIsAddPersonModalOpen] = useState(false);
  const [isSavingPerson, setIsSavingPerson] = useState(false);
  const [personNotice, setPersonNotice] = useState("");
  const [personType, setPersonType] = useState("EMPLOYEE");
  const [personForm, setPersonForm] = useState({
    name: "",
    email: "",
    roleLabel: "Employee",
    departmentId: "",
    designation: "",
    employeeCode: "",
    manager: "",
    salary: "",
    skills: "",
    hourlyRate: "",
    portfolioUrl: "",
    timezone: "",
  });

  async function loadPeople(active = true) {
    const [employeeRes, freelancerRes, departmentRes, projectRes] = await Promise.allSettled([
      employeeApi.getAll(),
      freelancerApi.getAll(),
      departmentApi.getAll(),
      projectApi.getAll(),
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
    const projectList =
      projectRes.status === "fulfilled"
        ? Array.isArray(projectRes.value)
          ? projectRes.value
          : projectRes.value?.data || []
        : [];

    if (
      employeeRes.status === "rejected" &&
      freelancerRes.status === "rejected" &&
      departmentRes.status === "rejected" &&
      projectRes.status === "rejected"
    ) {
      setError("Unable to load people data right now.");
    }

    const normalizedApiEmployees = employeeList.map(normalizeEmployee);
    setEmployees(
      employeeRes.status === "rejected"
        ? SHOW_DEMO_PEOPLE_ON_API_FAILURE
          ? sampleEmployees
          : []
        : normalizedApiEmployees
    );

    const normalizedApiFreelancers = freelancerList.map(normalizeFreelancer);
    setFreelancers(
      freelancerRes.status === "rejected"
        ? SHOW_DEMO_PEOPLE_ON_API_FAILURE
          ? sampleFreelancers
          : []
        : normalizedApiFreelancers
    );

    setDepartments(departmentList);
    setProjects(projectList);
  }

  useEffect(() => {
    let active = true;
    loadPeople(active).catch(() => {
      if (active) setError("Unable to load people data right now.");
    });
    return () => {
      active = false;
    };
  }, []);

  function resetPersonForm() {
    setPersonType("EMPLOYEE");
    setPersonForm({
      name: "",
      email: "",
      roleLabel: "Employee",
      departmentId: "",
      designation: "",
      employeeCode: "",
      manager: "",
      salary: "",
      skills: "",
      hourlyRate: "",
      portfolioUrl: "",
      timezone: "",
    });
    setPersonNotice("");
  }

  function openAddPersonModal() {
    resetPersonForm();
    setIsAddPersonModalOpen(true);
  }

  function closeAddPersonModal() {
    if (isSavingPerson) return;
    setIsAddPersonModalOpen(false);
    setPersonNotice("");
  }

  function isTemporaryDepartmentId(id) {
    return typeof id === "string" && id.startsWith("default-");
  }

  async function resolveDepartmentId(departmentId) {
    if (!departmentId) return undefined;
    const existing = departmentOptions.find((dept) => dept._id === departmentId);
    if (!existing) return departmentId;
    if (!isTemporaryDepartmentId(existing._id)) return existing._id;

    const result = await departmentApi.create({ name: existing.name });
    const createdDepartment = result?.data || result;
    if (createdDepartment && createdDepartment._id) {
      setDepartments((current) => [createdDepartment, ...current]);
      return createdDepartment._id;
    }

    return departmentId;
  }

  async function handleAddPersonSubmit(event) {
    event.preventDefault();

    if (!personForm.name.trim() || !personForm.email.trim()) {
      setPersonNotice("Name and email are required.");
      return;
    }

    if (personForm.salary && Number(personForm.salary) < 0) {
      setPersonNotice("Salary cannot be negative.");
      return;
    }

    if (personForm.hourlyRate && Number(personForm.hourlyRate) < 0) {
      setPersonNotice("Hourly rate cannot be negative.");
      return;
    }

    const autoPassword = `Wf360!${Math.random().toString(36).slice(2, 10)}A`;

    setIsSavingPerson(true);
    setPersonNotice("");

    try {
      const role = personType === "FREELANCER" ? "FREELANCER" : personType === "MANAGER" ? "MANAGER" : "EMPLOYEE";
      const registration = await authApi.register({
        name: personForm.name.trim(),
        email: personForm.email.trim(),
        password: autoPassword,
        role,
      });

      const createdUser = registration?.user || registration;
      const userId = createdUser?._id || createdUser?.id;
      if (!userId) {
        throw new Error("Unable to create user account.");
      }

      if (personType === "EMPLOYEE" || personType === "MANAGER") {
        const employeeCode = personForm.employeeCode.trim() || makeEmployeeCode(personForm.name);
        const departmentId = await resolveDepartmentId(personForm.departmentId);
        await employeeApi.create({
          userId,
          employeeCode,
          department: departmentId || undefined,
          designation: personForm.designation || personForm.roleLabel || undefined,
          ...(personForm.manager ? { manager: personForm.manager } : {}),
          ...(personForm.salary ? { salary: Number(personForm.salary) } : {}),
        });
      } else {
        const skills = String(personForm.skills)
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean);

        if (skills.length === 0) {
          throw new Error("Please enter at least one skill for the freelancer.");
        }

        await freelancerApi.create({
          userId,
          hourlyRate: Number(personForm.hourlyRate) || 0,
          skills,
          portfolioUrl: personForm.portfolioUrl || undefined,
          timezone: personForm.timezone || undefined,
        });
      }

      await loadPeople();
      setPersonNotice(`${personType === "EMPLOYEE" ? "Employee" : personType === "MANAGER" ? "Manager" : "Freelancer"} added successfully.`);
      setTimeout(() => {
        setIsAddPersonModalOpen(false);
        resetPersonForm();
      }, 800);
    } catch (err) {
      setPersonNotice(err?.message || "Failed to add the person. Please try again.");
    } finally {
      setIsSavingPerson(false);
    }
  }

  function getPersonStatus(person) {
    if (person.isActive === false || person.userId?.isActive === false) return "Inactive";
    if (person.currentProject || person.activeProject || person.project) return "On Project";
    return "Active";
  }

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

  const managerOptions = employees.filter((person) =>
    String(person.role || "").toLowerCase().includes("manager")
  );

  const departmentOptions = [
    ...departments,
    ...defaultDepartmentOptions.filter((defaultDept) =>
      !departments.some(
        (department) =>
          String(department.name || "").trim().toLowerCase() === defaultDept.name.toLowerCase()
      )
    ),
  ];

  const displayedDepartments = departmentOptions.map((department) => {
    const deptName = String(department.name || "").trim().toLowerCase();

    const deptEmployees = employees.filter(
      (e) => String(e.departmentName || "").trim().toLowerCase() === deptName
    );
    const deptFreelancers = freelancers.filter(
      (f) => String(f.departmentName || "").trim().toLowerCase() === deptName
    );
    const onProjectFreelancers = deptFreelancers.filter(
      (f) => getPersonStatus(f) === "On Project"
    );

    return {
      ...department,
      deptEmployees,
      deptFreelancers,
      onProjectFreelancers,
      employeeCount: deptEmployees.length,
      freelancerCount: deptFreelancers.length,
      onProjectCount: onProjectFreelancers.length,
      headcount: deptEmployees.length + deptFreelancers.length,
      location: department.location || "Not specified",
    };
  });

  function handleEmployeeSelection(employeeId) {
    const employee = employees.find((person) => person._id === employeeId);
    setAssignment({
      employeeId,
      employeeName: employee?.name || "",
      employeeEmail: employee?.email || "",
      employeeRole: employee?.role || "",
      departmentId: employee?.department?._id || "",
      managerId: employee?.manager?._id || employee?.manager || "",
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

  function openAddDepartmentModal() {
    setNewDepartmentName("");
    setNewDepartmentNotice("");
    setIsAddDepartmentModalOpen(true);
  }

  function closeDepartmentModal() {
    if (isSavingAssignment) return;
    setIsDepartmentModalOpen(false);
    setAssignmentNotice("");
  }

  function closeAddDepartmentModal() {
    if (isSavingDepartment) return;
    setIsAddDepartmentModalOpen(false);
    setNewDepartmentNotice("");
  }

  async function handleAddDepartmentSubmit(event) {
    event.preventDefault();

    if (!newDepartmentName.trim()) {
      setNewDepartmentNotice("Department name is required.");
      return;
    }

    setIsSavingDepartment(true);
    setNewDepartmentNotice("");

    try {
      const result = await departmentApi.create({ name: newDepartmentName.trim() });
      const createdDepartment = result?.data || result;
      setDepartments((current) => [createdDepartment, ...current]);
      setNewDepartmentNotice(`Department "${newDepartmentName.trim()}" added successfully.`);
      setTimeout(() => {
        closeAddDepartmentModal();
      }, 700);
    } catch (err) {
      setNewDepartmentNotice(err?.message || "Failed to save department.");
    } finally {
      setIsSavingDepartment(false);
    }
  }

  async function handleDepartmentSubmit(event) {
    event.preventDefault();

    if (!assignment.employeeId) {
      setAssignmentNotice("Select an existing employee from the list above.");
      return;
    }

    setIsSavingAssignment(true);
    setAssignmentNotice("");

    try {
      const selectedDepartment = departmentOptions.find(
        (d) => d._id === assignment.departmentId
      );
      const selectedManager = managerOptions.find((m) => (m.userId?._id || m._id) === assignment.managerId);
      const departmentId = await resolveDepartmentId(assignment.departmentId);

      await employeeApi.update(assignment.employeeId, {
        departmentId: departmentId || null,
        ...(assignment.managerId !== undefined ? { manager: assignment.managerId || null } : {}),
      });

      // Optimistically update local state
      setEmployees((current) =>
        current.map((emp) =>
          emp._id === assignment.employeeId
            ? {
                ...emp,
                departmentName: selectedDepartment?.name || "Unassigned",
                managerName: selectedManager?.name || emp.managerName || "No manager",
              }
            : emp
        )
      );

      setAssignmentNotice(
        selectedDepartment
          ? `Department updated to "${selectedDepartment.name}".`
          : "Department cleared."
      );
      setTimeout(() => {
        setIsDepartmentModalOpen(false);
        setAssignmentNotice("");
      }, 700);
    } catch (err) {
      setAssignmentNotice(err.message || "Failed to update department.");
    } finally {
      setIsSavingAssignment(false);
    }
  }

  function scoreLocally(jobDescription, jobSkills, candidateList) {
    const jobWords = new Set(
      [jobDescription, ...jobSkills]
        .join(" ")
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 2)
    );
    const normalizedJobSkills = jobSkills.map((s) => String(s).toLowerCase().trim());

    return candidateList
      .map((f) => {
        const fSkills = (f.skills || []).map((s) => String(s).toLowerCase().trim());
        const matched = normalizedJobSkills.filter((s) =>
          fSkills.some((fs) => fs.includes(s) || s.includes(fs))
        );
        const skillOverlap = normalizedJobSkills.length > 0 ? matched.length / normalizedJobSkills.length : 0;

        const fWords = new Set(fSkills.join(" ").split(/\W+/).filter((w) => w.length > 2));
        const sharedWords = [...jobWords].filter((w) => fWords.has(w)).length;
        const tokenCoverage = jobWords.size > 0 ? sharedWords / jobWords.size : 0;

        // Skill breadth only applies as a tiebreaker when the freelancer
        // already has at least one required skill match. A freelancer with
        // zero required skill matches must never appear in results.
        const skillBreadth = skillOverlap > 0 ? Math.min(fSkills.length / 6, 1.0) : 0;

        // Weights: 50% required skill match, 20% keyword coverage, 30% breadth
        const finalScore = +(skillOverlap * 0.50 + tokenCoverage * 0.20 + skillBreadth * 0.30).toFixed(4);

        return {
          freelancerId: f._id,
          userId: { name: f.name, email: f.email },
          skills: f.skills || [],
          hourlyRate: f.hourlyRate,
          matchedSkills: matched,
          requiredCount: normalizedJobSkills.length,
          scores: {
            tfidf: null,
            skillOverlap: +skillOverlap.toFixed(4),
            skillBreadth: +skillBreadth.toFixed(4),
            tokenCoverage: +tokenCoverage.toFixed(4),
            final: finalScore,
          },
          source: "local",
        };
      })
      // Only show freelancers who matched at least one required skill.
      // If no required skills were specified, fall back to token coverage.
      .filter((r) =>
        normalizedJobSkills.length > 0
          ? r.matchedSkills.length > 0
          : r.scores.final > 0
      );
  }

  async function handleMatchSubmit(e) {
    e.preventDefault();

    if (!matchForm.projectId && !matchForm.description.trim() && !matchForm.requiredSkills.trim()) {
      setMatchError("Select a project or enter a description and required skills.");
      return;
    }

    setMatchLoading(true);
    setMatchError("");
    setMatchResults([]);

    try {
      const requiredSkillsArray = matchForm.requiredSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      let jobDescription = matchForm.description.trim();
      let jobSkills = requiredSkillsArray;
      let backendResults = [];
      const backendIds = new Set();

      try {
        const payload = matchForm.projectId
          ? { projectId: matchForm.projectId }
          : { description: jobDescription, requiredSkills: jobSkills };

        const data = await freelancerApi.match(payload);
        backendResults = Array.isArray(data) ? data : data?.matches || [];

        if (matchForm.projectId && data?.jobDescription) {
          jobDescription = data.jobDescription;
          jobSkills = data.requiredSkills || [];
        }

        const reqCount = jobSkills.length;
        backendResults = backendResults.map((r) => ({ ...r, requiredCount: reqCount }));
        backendResults.forEach((r) => {
          const id = String(r.freelancerId || r._id || "");
          if (id) backendIds.add(id);
        });
      } catch (backendErr) {
        if (matchForm.projectId) throw backendErr;
      }

      const unmatched = freelancers.filter(
        (f) => f._id && !backendIds.has(String(f._id))
      );
      const localResults = scoreLocally(jobDescription, jobSkills, unmatched);

      // When required skills were specified, drop any result (backend or local)
      // that matched zero of them — pure text/TF-IDF hits are not enough.
      const strictFilter = jobSkills.length > 0
        ? (r) => (r.matchedSkills || []).length > 0
        : () => true;

      const combined = [...backendResults, ...localResults]
        .filter(strictFilter)
        .sort((a, b) => (b.scores?.final ?? 0) - (a.scores?.final ?? 0));

      setMatchResults(combined);

      if (combined.length === 0) {
        setMatchError("No freelancers matched the given requirements. Try different skills or a broader description.");
      }
    } catch (err) {
      setMatchError(err.message || "Matching failed. Check your inputs and try again.");
    } finally {
      setMatchLoading(false);
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

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={openAddPersonModal}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Add Person
          </button>
          <button
            type="button"
            onClick={() => { setIsMatchModalOpen(true); setMatchResults([]); setMatchError(""); setMatchForm({ projectId: "", description: "", requiredSkills: "" }); }}
            className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
          >
            Match Freelancers
          </button>
          <button
            type="button"
            onClick={() => openAddDepartmentModal()}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Add Department
          </button>
          <button
            type="button"
            onClick={() => openDepartmentModal()}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Assign Department
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
              {displayedDepartments.filter((d) => d.headcount > 0).length} active · {displayedDepartments.length} total
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
                <div className="mt-4 space-y-1 text-sm text-slate-600">
                  <p>Manager: <span className="font-semibold text-slate-800">{department.head?.name || department.manager?.name || "Not assigned"}</span></p>
                    <p>Location: <span className="font-semibold text-slate-800">{department.location || "Not specified"}</span></p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white p-3 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Employees</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{department.employeeCount}</p>
                    {department.deptEmployees.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {department.deptEmployees.slice(0, 3).map((e) => (
                          <p key={e._id} className="truncate text-[11px] text-slate-500">{e.name}</p>
                        ))}
                        {department.deptEmployees.length > 3 && (
                          <p className="text-[11px] text-slate-400">+{department.deptEmployees.length - 3} more</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl bg-white p-3 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Freelancers</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{department.freelancerCount}</p>
                    {department.deptFreelancers.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {department.deptFreelancers.slice(0, 3).map((f) => (
                          <div key={f._id} className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${getPersonStatus(f) === "On Project" ? "bg-blue-500" : "bg-emerald-400"}`} />
                            <p className="truncate text-[11px] text-slate-500">{f.name}</p>
                          </div>
                        ))}
                        {department.deptFreelancers.length > 3 && (
                          <p className="text-[11px] text-slate-400">+{department.deptFreelancers.length - 3} more</p>
                        )}
                      </div>
                    )}
                    {department.onProjectCount > 0 && (
                      <p className="mt-2 text-[11px] font-bold text-blue-600">{department.onProjectCount} on project</p>
                    )}
                  </div>
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
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${statusColors[getPersonStatus(person)] || "bg-slate-100 text-slate-600"}`}>
                        {getPersonStatus(person)}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">Synced from profile</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-slate-500">Skills</span>
                      <span className="font-semibold text-slate-800 text-right max-w-[60%] truncate">
                        {Array.isArray(person.skills) ? person.skills.join(", ") : person.role}
                      </span>
                    </div>
                    {"hourlyRate" in person && person.hourlyRate ? (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-slate-500">Hourly Rate</span>
                        <span className="font-semibold text-slate-800">${person.hourlyRate}/hr</span>
                      </div>
                    ) : null}
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

      {isMatchModalOpen ? (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-7 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-600">TF-IDF Skill Matching</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Match Freelancers to a Project</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Select a project or describe requirements manually. The algorithm ranks freelancers by skill relevance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMatchModalOpen(false)}
                className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500 transition hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleMatchSubmit} className="mt-6 space-y-5">
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Project (optional)</span>
                <select
                  value={matchForm.projectId}
                  onChange={(e) => setMatchForm((f) => ({ ...f, projectId: e.target.value }))}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                >
                  <option value="">— Enter requirements manually —</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>{p.title || p.name}</option>
                  ))}
                </select>
              </label>

              {!matchForm.projectId && (
                <>
                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Project Description</span>
                    <textarea
                      rows={3}
                      value={matchForm.description}
                      onChange={(e) => setMatchForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Describe the project and required expertise..."
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-rose-300 focus:bg-white resize-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Required Skills (comma-separated)</span>
                    <input
                      type="text"
                      value={matchForm.requiredSkills}
                      onChange={(e) => setMatchForm((f) => ({ ...f, requiredSkills: e.target.value }))}
                      placeholder="e.g. React, Node.js, PostgreSQL"
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-rose-300 focus:bg-white"
                    />
                  </label>
                </>
              )}

              {matchError ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  {matchError}
                </div>
              ) : null}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={matchLoading}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {matchLoading ? "Matching..." : "Find Best Matches"}
                </button>
              </div>
            </form>

            {matchResults.length > 0 && (() => {
              const topScore = matchResults[0]?.scores?.final ?? 0;
              const lowQuality = topScore < 0.4;
              const tiedTop = matchResults.filter(
                (r) => Math.abs((r.scores?.final ?? 0) - topScore) < 0.05
              ).length > 1;

              return (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {matchResults.length} Ranked Matches
                    </p>
                    {(lowQuality || tiedTop) && (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">
                        {lowQuality ? "Low confidence — review with supervisor" : "Tied results — supervisor input recommended"}
                      </span>
                    )}
                  </div>

                  {(lowQuality || tiedTop) && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      <p className="font-bold">Supervisor Review Recommended</p>
                      <p className="mt-1 text-xs">
                        {lowQuality
                          ? "No freelancer closely matches the requirements. Consider broadening the skill list or consulting your supervisor before assigning."
                          : "Multiple freelancers have similar scores. Supervisor should review their portfolios and availability before a final decision."}
                      </p>
                    </div>
                  )}

                  {matchResults.map((result, idx) => {
                    const freelancerName = result.userId?.name || result.name || "Freelancer";
                    const freelancerEmail = result.userId?.email || result.email || "";
                    const skills = result.skills || [];
                    const scores = result.scores || null;
                    const finalScore = scores?.final ?? null;
                    const matchedSkills = result.matchedSkills || [];
                    const requiredCount = result.requiredCount ?? matchedSkills.length;
                    const isLocal = result.source === "local";
                    const pct = finalScore !== null ? Math.round(finalScore * 100) : 0;

                    const scoreBadgeColor = pct >= 75
                      ? "bg-emerald-50 text-emerald-700"
                      : pct >= 50
                        ? "bg-amber-50 text-amber-700"
                        : "bg-rose-50 text-rose-700";
                    const barColor = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-400";

                    const recommendation = pct >= 75
                      ? "Strong fit — recommended for this project."
                      : pct >= 50
                        ? "Partial fit — may need additional onboarding."
                        : "Weak fit — consult supervisor before assigning.";

                    return (
                      <article key={result.freelancerId || result._id || idx} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-xs font-black text-rose-700">
                              {getInitials(freelancerName)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-900">#{idx + 1} {freelancerName}</p>
                              {freelancerEmail && (
                                <p className="text-xs text-slate-500 truncate">{freelancerEmail}</p>
                              )}
                              {skills.length > 0 && (
                                <p className="mt-0.5 text-xs text-slate-400 truncate">{skills.join(", ")}</p>
                              )}
                            </div>
                          </div>
                          {finalScore !== null && (
                            <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${scoreBadgeColor}`}>
                              {pct}% match
                            </span>
                          )}
                        </div>

                        <div className="mt-3">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        {matchedSkills.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-1">
                            <span className="text-[11px] text-slate-400 mr-1">
                              {matchedSkills.length}/{requiredCount} required:
                            </span>
                            {matchedSkills.map((skill) => (
                              <span key={skill} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="mt-2 text-[11px] text-slate-500 italic">{recommendation}</p>

                        {scores && (
                          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-400">
                            {!isLocal && scores.tfidf !== null && (
                              <span>TF-IDF: <strong className="text-slate-600">{(scores.tfidf * 100).toFixed(0)}%</strong></span>
                            )}
                            <span>
                              Required skills: <strong className="text-slate-600">
                                {matchedSkills.length}/{requiredCount}
                              </strong>
                            </span>
                            {isLocal && scores.skillBreadth !== undefined && (
                              <span>Breadth: <strong className="text-slate-600">{(scores.skillBreadth * 100).toFixed(0)}%</strong></span>
                            )}
                            <span>Coverage: <strong className="text-slate-600">{(scores.tokenCoverage * 100).toFixed(0)}%</strong></span>
                            {result.hourlyRate && (
                              <span>Rate: <strong className="text-slate-600">${result.hourlyRate}/hr</strong></span>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      ) : null}

      {isAddPersonModalOpen ? (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-7 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-600">Add New Person</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Create an employee or freelancer</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Register a new user account and attach the profile to the people roster.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddPersonModal}
                className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500 transition hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddPersonSubmit} className="mt-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Profile Type</span>
                  <select
                    value={personType}
                    onChange={(e) => {
                      const type = e.target.value;
                      setPersonType(type);
                      setPersonForm((current) => ({
                        ...current,
                        roleLabel: type === "EMPLOYEE" ? "Employee" : type === "MANAGER" ? "Manager" : "Freelancer",
                      }));
                    }}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="FREELANCER">Freelancer</option>
                  </select>
                </label>

              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="block md:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Full name</span>
                  <input
                    type="text"
                    value={personForm.name}
                    onChange={(e) => setPersonForm((current) => ({ ...current, name: e.target.value }))}
                    placeholder="Sita Sharma"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                  />
                </label>
                <label className="block md:col-span-1">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Email</span>
                  <input
                    type="email"
                    value={personForm.email}
                    onChange={(e) => setPersonForm((current) => ({ ...current, email: e.target.value }))}
                    placeholder="sita.sharma@example.com"
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {personType !== "MANAGER" ? (
                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Role / Title</span>
                    <input
                      type="text"
                      value={personForm.roleLabel}
                      onChange={(e) => setPersonForm((current) => ({ ...current, roleLabel: e.target.value }))}
                      placeholder={personType === "EMPLOYEE" ? "Backend Developer" : "Full Stack Freelancer"}
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                    />
                  </label>
                ) : (
                  <div className="hidden md:block" />
                )}

                {personType !== "FREELANCER" ? (
                  <>
                    <label className="block">
                      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Department</span>
                      <select
                        value={personForm.departmentId}
                        onChange={(e) => setPersonForm((current) => ({ ...current, departmentId: e.target.value }))}
                        className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                      >
                        <option value="">Unassigned</option>
                        {departmentOptions.map((department) => (
                          <option key={department._id} value={department._id}>{department.name}</option>
                        ))}
                      </select>
                    </label>
                    {personType === "EMPLOYEE" ? (
                      <label className="block">
                        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Manager</span>
                        <select
                          value={personForm.manager}
                          onChange={(e) => setPersonForm((current) => ({ ...current, manager: e.target.value }))}
                          className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                        >
                          <option value="">Unassigned</option>
                          {managerOptions.length ? (
                            managerOptions.map((manager) => (
                              <option key={manager._id} value={manager.userId?._id || manager._id}>
                                {manager.name} ({manager.email})
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>No managers available yet</option>
                          )}
                        </select>
                      </label>
                    ) : null}
                  </>
                ) : (
                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Hourly Rate</span>
                    <input
                      type="number"
                      value={personForm.hourlyRate}
                      onChange={(e) => setPersonForm((current) => ({ ...current, hourlyRate: e.target.value }))}
                      placeholder="20"
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                    />
                  </label>
                )}
              </div>

              {personType === "EMPLOYEE" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Designation</span>
                    <input
                      type="text"
                      value={personForm.designation}
                      onChange={(e) => setPersonForm((current) => ({ ...current, designation: e.target.value }))}
                      placeholder="Senior Engineer"
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Employee code</span>
                    <input
                      type="text"
                      value={personForm.employeeCode}
                      onChange={(e) => setPersonForm((current) => ({ ...current, employeeCode: e.target.value }))}
                      placeholder="EMP-1234"
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                    />
                  </label>
                </div>
              ) : (
                <div>
                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Skills</span>
                    <input
                      type="text"
                      value={personForm.skills}
                      onChange={(e) => setPersonForm((current) => ({ ...current, skills: e.target.value }))}
                      placeholder="React, Node.js, MongoDB"
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                    />
                  </label>
                </div>
              )}


              {personType === "FREELANCER" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">GitHub URL</span>
                    <input
                      type="url"
                      value={personForm.portfolioUrl}
                      onChange={(e) => setPersonForm((current) => ({ ...current, portfolioUrl: e.target.value }))}
                      placeholder="https://github.com/username"
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Timezone</span>
                    <input
                      type="text"
                      value={personForm.timezone}
                      onChange={(e) => setPersonForm((current) => ({ ...current, timezone: e.target.value }))}
                      placeholder="UTC+5:45"
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                    />
                  </label>
                </div>
              ) : null}

              {personNotice ? (
                <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${personNotice.toLowerCase().includes("failed") || personNotice.toLowerCase().includes("required") ? "border border-amber-200 bg-amber-50 text-amber-800" : "border border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                  {personNotice}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeAddPersonModal}
                  disabled={isSavingPerson}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPerson}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingPerson ? "Adding Person..." : "Save Person"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isAddDepartmentModalOpen ? (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-600">New Department</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Add a department</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Create a new department so it appears in the people and assignment selectors.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { if (!isSavingDepartment) setIsAddDepartmentModalOpen(false); }}
                className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500 transition hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddDepartmentSubmit} className="mt-6 space-y-5">
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Department name</span>
                <input
                  type="text"
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  placeholder="e.g. Research & Development"
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                />
              </label>

              {newDepartmentNotice ? (
                <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${newDepartmentNotice.toLowerCase().includes("failed") || newDepartmentNotice.toLowerCase().includes("required") ? "border border-amber-200 bg-amber-50 text-amber-800" : "border border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                  {newDepartmentNotice}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => { if (!isSavingDepartment) setIsAddDepartmentModalOpen(false); }}
                  disabled={isSavingDepartment}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDepartment}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingDepartment ? "Saving..." : "Save Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isDepartmentModalOpen ? (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-600">Department Assignment</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Assign department details</h2>
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
                <label className="block md:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Employee</span>
                  <select
                    value={assignment.employeeId}
                    onChange={(event) => handleEmployeeSelection(event.target.value)}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                  >
                    <option value="">— Select an employee —</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} ({emp.email})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block md:col-span-2">
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
                <label className="block md:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Manager</span>
                  <select
                    value={assignment.managerId}
                    onChange={(event) => setAssignment((current) => ({ ...current, managerId: event.target.value }))}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
                  >
                    <option value="">Unassigned</option>
                    {managerOptions.length ? (
                      managerOptions.map((manager) => (
                        <option key={manager._id} value={manager.userId?._id || manager._id}>
                          {manager.name} ({manager.email})
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No managers available</option>
                    )}
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
