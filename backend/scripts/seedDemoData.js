import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Role from "../models/Role.js";
import Department from "../models/Department.js";
import Employee from "../models/Employee.js";
import Freelancer from "../models/Freelancer.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Leave from "../models/Leave.js";
import Attendance from "../models/Attendance.js";
import Timesheet from "../models/Timesheet.js";
import Invoice from "../models/Invoice.js";
import Payroll from "../models/Payroll.js";
import PerformanceReview from "../models/Performance.js";

dotenv.config();

const DEMO_USERS = [
  { name: "Admin User", email: "admin@company.com", password: "admin123", role: "ADMIN" },
  { name: "Maya Manager", email: "manager@company.com", password: "manager123", role: "MANAGER" },
  { name: "Ethan Employee", email: "employee@company.com", password: "employee123", role: "EMPLOYEE" },
  { name: "Nina Employee", email: "employee2@company.com", password: "employee123", role: "EMPLOYEE" },
  { name: "Felix Freelancer", email: "freelancer@company.com", password: "freelancer123", role: "FREELANCER" },
  { name: "Priya Freelancer", email: "freelancer2@company.com", password: "freelancer123", role: "FREELANCER" },
];

async function upsertUser(definition) {
  const hashedPassword = await bcrypt.hash(definition.password, 10);
  return User.findOneAndUpdate(
    { email: definition.email },
    {
      name: definition.name,
      email: definition.email,
      password: hashedPassword,
      role: definition.role,
      isActive: true,
      lastLogout: null,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in backend/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const users = {};
  for (const demoUser of DEMO_USERS) {
    users[demoUser.email] = await upsertUser(demoUser);
  }

  const adminUser = users["admin@company.com"];
  const managerUser = users["manager@company.com"];
  const employeeUser = users["employee@company.com"];
  const employeeTwoUser = users["employee2@company.com"];
  const freelancerUser = users["freelancer@company.com"];
  const freelancerTwoUser = users["freelancer2@company.com"];

  const engineering = await Department.findOneAndUpdate(
    { name: "Engineering" },
    { name: "Engineering", description: "Product engineering and delivery", head: managerUser._id },
    { new: true, upsert: true }
  );
  const design = await Department.findOneAndUpdate(
    { name: "Design" },
    { name: "Design", description: "Design systems and UX", head: managerUser._id },
    { new: true, upsert: true }
  );

  const frontendRole = await Role.findOneAndUpdate(
    { title: "Frontend Engineer" },
    { title: "Frontend Engineer", level: "L2" },
    { new: true, upsert: true }
  );
  const productDesignerRole = await Role.findOneAndUpdate(
    { title: "Product Designer" },
    { title: "Product Designer", level: "L2" },
    { new: true, upsert: true }
  );

  const employeeProfile = await Employee.findOneAndUpdate(
    { userId: employeeUser._id },
    {
      userId: employeeUser._id,
      employeeCode: "WF-EMP-001",
      department: engineering._id,
      designation: frontendRole._id,
      salary: 8500,
      joiningDate: new Date("2025-04-08"),
      phone: "+9779800000001",
      emergencyContact: "Arjun Employee",
    },
    { new: true, upsert: true }
  );
  const employeeTwoProfile = await Employee.findOneAndUpdate(
    { userId: employeeTwoUser._id },
    {
      userId: employeeTwoUser._id,
      employeeCode: "WF-EMP-002",
      department: design._id,
      designation: productDesignerRole._id,
      salary: 7800,
      joiningDate: new Date("2025-07-15"),
      phone: "+9779800000002",
      emergencyContact: "Sara Employee",
    },
    { new: true, upsert: true }
  );

  const freelancerProfile = await Freelancer.findOneAndUpdate(
    { userId: freelancerUser._id },
    {
      userId: freelancerUser._id,
      hourlyRate: 55,
      skills: ["React", "Vite", "Tailwind CSS"],
      portfolioUrl: "https://portfolio.example/felix",
      timezone: "Asia/Kathmandu",
    },
    { new: true, upsert: true }
  );
  const freelancerTwoProfile = await Freelancer.findOneAndUpdate(
    { userId: freelancerTwoUser._id },
    {
      userId: freelancerTwoUser._id,
      hourlyRate: 48,
      skills: ["Figma", "UI Design", "Design Systems"],
      portfolioUrl: "https://portfolio.example/priya",
      timezone: "Asia/Kolkata",
    },
    { new: true, upsert: true }
  );

  const mobileProject = await Project.findOneAndUpdate(
    { name: "Mobile Redesign" },
    {
      name: "Mobile Redesign",
      description: "Refresh the client mobile app onboarding and dashboard flows.",
      budget: 18000,
      deadline: new Date("2026-04-25"),
      status: "ACTIVE",
      manager: managerUser._id,
      requiredSkills: ["React", "Tailwind CSS", "UX"],
      freelancers: [freelancerProfile._id],
    },
    { new: true, upsert: true }
  );
  const analyticsProject = await Project.findOneAndUpdate(
    { name: "Analytics Dashboard" },
    {
      name: "Analytics Dashboard",
      description: "Create a manager-facing analytics dashboard with reporting exports.",
      budget: 22000,
      deadline: new Date("2026-04-12"),
      status: "ACTIVE",
      manager: managerUser._id,
      requiredSkills: ["Design Systems", "Data Visualization"],
      freelancers: [freelancerTwoProfile._id],
    },
    { new: true, upsert: true }
  );

  await Task.deleteMany({ project: { $in: [mobileProject._id, analyticsProject._id] } });
  await Task.insertMany([
    {
      title: "Complete onboarding API integration",
      description: "Wire employee-facing onboarding widgets to backend APIs.",
      project: mobileProject._id,
      assignee: employeeUser._id,
      createdBy: managerUser._id,
      status: "IN_PROGRESS",
      priority: "HIGH",
      deadline: new Date("2026-03-30"),
      tags: ["api", "frontend"],
    },
    {
      title: "Write regression tests for auth flow",
      description: "Protect login and token refresh flow from regressions.",
      project: mobileProject._id,
      assignee: employeeUser._id,
      createdBy: managerUser._id,
      status: "TODO",
      priority: "MEDIUM",
      deadline: new Date("2026-04-02"),
      tags: ["tests", "auth"],
    },
    {
      title: "Prepare design QA checklist",
      description: "Audit layout consistency before release handoff.",
      project: analyticsProject._id,
      assignee: employeeTwoUser._id,
      createdBy: managerUser._id,
      status: "COMPLETED",
      priority: "LOW",
      deadline: new Date("2026-03-20"),
      tags: ["design", "qa"],
    },
    {
      title: "Deliver mobile card redesign",
      description: "Implement the new mobile dashboard cards.",
      project: mobileProject._id,
      assignee: freelancerUser._id,
      createdBy: managerUser._id,
      status: "IN_PROGRESS",
      priority: "HIGH",
      deadline: new Date("2026-04-05"),
      tags: ["react", "ui"],
    },
    {
      title: "Refine analytics widget styles",
      description: "Polish chart legends and dashboard spacing.",
      project: analyticsProject._id,
      assignee: freelancerTwoUser._id,
      createdBy: managerUser._id,
      status: "TODO",
      priority: "MEDIUM",
      deadline: new Date("2026-04-03"),
      tags: ["figma", "design-system"],
    },
  ]);

  await Leave.deleteMany({ employee: { $in: [employeeProfile._id, employeeTwoProfile._id] } });
  await Leave.insertMany([
    {
      employee: employeeProfile._id,
      type: "VACATION",
      from: new Date("2026-03-28"),
      to: new Date("2026-03-30"),
      reason: "Family trip",
      status: "PENDING",
    },
    {
      employee: employeeTwoProfile._id,
      type: "SICK",
      from: new Date("2026-03-12"),
      to: new Date("2026-03-12"),
      reason: "Medical appointment",
      status: "APPROVED",
      approvedBy: managerUser._id,
      comment: "Take care and recover well.",
    },
  ]);

  await Attendance.deleteMany({ employee: { $in: [employeeProfile._id, employeeTwoProfile._id] } });
  await Attendance.insertMany([
    { employee: employeeProfile._id, date: new Date("2026-03-24"), clockIn: new Date("2026-03-24T09:00:00"), clockOut: new Date("2026-03-24T17:30:00") },
    { employee: employeeProfile._id, date: new Date("2026-03-25"), clockIn: new Date("2026-03-25T08:50:00"), clockOut: new Date("2026-03-25T17:10:00") },
    { employee: employeeProfile._id, date: new Date("2026-03-26"), clockIn: new Date("2026-03-26T09:05:00"), clockOut: new Date("2026-03-26T17:35:00") },
    { employee: employeeTwoProfile._id, date: new Date("2026-03-24"), clockIn: new Date("2026-03-24T09:15:00"), clockOut: new Date("2026-03-24T17:00:00") },
    { employee: employeeTwoProfile._id, date: new Date("2026-03-25"), clockIn: new Date("2026-03-25T09:00:00"), clockOut: new Date("2026-03-25T17:20:00") },
  ]);

  await Payroll.deleteMany({ employee: { $in: [employeeProfile._id, employeeTwoProfile._id] }, month: { $in: ["2026-03", "2026-02"] } });
  await Payroll.insertMany([
    {
      employee: employeeProfile._id,
      month: "2026-03",
      grossSalary: 8500,
      deductions: 1850,
      netSalary: 6650,
      breakdown: {
        totalDaysInMonth: 31,
        daysAttended: 20,
        leaveDays: 2,
        lopDays: 9,
        lopDeduction: 1100,
        taxDeduction: 750,
      },
    },
    {
      employee: employeeProfile._id,
      month: "2026-02",
      grossSalary: 8500,
      deductions: 1700,
      netSalary: 6800,
      breakdown: {
        totalDaysInMonth: 28,
        daysAttended: 21,
        leaveDays: 1,
        lopDays: 6,
        lopDeduction: 850,
        taxDeduction: 850,
      },
    },
    {
      employee: employeeTwoProfile._id,
      month: "2026-03",
      grossSalary: 7800,
      deductions: 1500,
      netSalary: 6300,
      breakdown: {
        totalDaysInMonth: 31,
        daysAttended: 22,
        leaveDays: 1,
        lopDays: 8,
        lopDeduction: 720,
        taxDeduction: 780,
      },
    },
  ]);

  await Timesheet.deleteMany({ freelancer: { $in: [freelancerProfile._id, freelancerTwoProfile._id] } });
  await Timesheet.insertMany([
    {
      freelancer: freelancerProfile._id,
      project: mobileProject._id,
      hours: 6.5,
      date: new Date("2026-03-24"),
      description: "Built onboarding task cards.",
      qualityRating: 5,
      status: "APPROVED",
    },
    {
      freelancer: freelancerProfile._id,
      project: mobileProject._id,
      hours: 5.25,
      date: new Date("2026-03-25"),
      description: "Refined mobile interactions.",
      qualityRating: 4,
      status: "PENDING",
    },
    {
      freelancer: freelancerTwoProfile._id,
      project: analyticsProject._id,
      hours: 4.75,
      date: new Date("2026-03-24"),
      description: "Updated chart styling in Figma.",
      qualityRating: 4,
      status: "APPROVED",
    },
  ]);

  await Invoice.deleteMany({ freelancer: { $in: [freelancerProfile._id, freelancerTwoProfile._id] } });
  await Invoice.insertMany([
    {
      freelancer: freelancerProfile._id,
      project: mobileProject._id,
      totalHours: 12,
      amount: 660,
      issueDate: new Date("2026-03-20"),
      dueDate: new Date("2026-04-03"),
      status: "PENDING",
    },
    {
      freelancer: freelancerTwoProfile._id,
      project: analyticsProject._id,
      totalHours: 18,
      amount: 864,
      issueDate: new Date("2026-03-18"),
      dueDate: new Date("2026-04-01"),
      status: "PAID",
    },
  ]);

  await PerformanceReview.deleteMany({ user: { $in: [employeeUser._id, employeeTwoUser._id, freelancerUser._id, freelancerTwoUser._id] } });
  await PerformanceReview.insertMany([
    {
      user: employeeUser._id,
      reviewer: managerUser._id,
      rating: 4.7,
      feedback: "Strong ownership on integration work and dependable follow-through.",
      period: "2026-Q1",
    },
    {
      user: employeeTwoUser._id,
      reviewer: managerUser._id,
      rating: 4.3,
      feedback: "Consistent design quality with good collaboration across teams.",
      period: "2026-Q1",
    },
    {
      user: freelancerUser._id,
      reviewer: managerUser._id,
      rating: 4.8,
      feedback: "Excellent turnaround time and strong implementation quality.",
      period: "2026-Q1",
    },
  ]);

  console.log("Demo data seeded successfully.");
  console.log("Login credentials:");
  for (const demoUser of DEMO_USERS) {
    console.log(`- ${demoUser.role}: ${demoUser.email} / ${demoUser.password}`);
  }
}

main()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    console.error("Demo seed failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  });
