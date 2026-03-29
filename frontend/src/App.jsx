import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login            from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminPeople from "./pages/admin/People";
import AdminPerformance from "./pages/admin/Performance";
import AdminPayroll from "./pages/admin/Payroll";
import AdminProjects from "./pages/admin/Projects";
import EmployeeDashboard from "./pages/employee/Dashboard";
import ApplyLeave        from "./pages/employee/ApplyLeave";
import ViewPayslip from "./pages/employee/Payslip";
import MyTasks from "./pages/employee/MyTaskPage";
import Timesheet from "./pages/employee/Timesheet";
import ManagerDashboard from "./pages/manager/Dashboard";
import ManagerLeaves from "./pages/manager/Leaves";
import ManagerEmployees from "./pages/manager/Employees";
import ManagerPerformance from "./pages/manager/Performance";
import ManagerPayroll from "./pages/manager/Payroll";
import FreelancerDashboard from "./pages/freelancer/Dashboard";
import FreelancerProjects from "./pages/freelancer/Projects";
import FreelancerTasks from "./pages/freelancer/Tasks";
import FreelancerTimesheets from "./pages/freelancer/Timesheets";
import FreelancerInvoices from "./pages/freelancer/Invoices";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                      element={<Login />} />

        <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
          <Route path="/admin/dashboard"       element={<AdminDashboard />} />
          <Route path="/admin/people"          element={<AdminPeople />} />
          <Route path="/admin/performance"     element={<AdminPerformance />} />
          <Route path="/admin/payroll"         element={<AdminPayroll />} />
          <Route path="/admin/projects"        element={<AdminProjects />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["EMPLOYEE"]} />}>
          <Route path="/employee/dashboard"    element={<EmployeeDashboard />} />
          <Route path="/employee/leave"        element={<ApplyLeave />} />
          <Route path="/employee/payslip"      element={<ViewPayslip />} />
          <Route path="/employee/tasks"        element={<MyTasks />} />
          <Route path="/employee/timesheet"    element={<Timesheet />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["MANAGER"]} />}>
          <Route path="/manager/dashboard"     element={<ManagerDashboard />} />
          <Route path="/manager/leaves"        element={<ManagerLeaves />} />
          <Route path="/manager/employees"     element={<ManagerEmployees />} />
          <Route path="/manager/performance"   element={<ManagerPerformance />} />
          <Route path="/manager/payroll"       element={<ManagerPayroll />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["FREELANCER"]} />}>
          <Route path="/freelancer/dashboard"  element={<FreelancerDashboard />} />
          <Route path="/freelancer/projects"   element={<FreelancerProjects />} />
          <Route path="/freelancer/tasks"      element={<FreelancerTasks />} />
          <Route path="/freelancer/timesheets" element={<FreelancerTimesheets />} />
          <Route path="/freelancer/invoices"   element={<FreelancerInvoices />} />
        </Route>

        <Route path="*"                      element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
