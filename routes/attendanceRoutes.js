// import express from "express";
// import { register, login, logout, getMe } from "../controllers/AuthController.js";
// import { verifyToken } from "../middleware/auth.js";

// const router = express.Router();

// router.post("/register", register);
// router.post("/login", login);
// router.post("/logout", verifyToken, logout);
// router.get("/me", verifyToken, getMe);

// export default router;


import express from "express";
import {
  clockIn,
  clockOut,
  getMyAttendance,
  getAllAttendance,
  getAttendanceSummary
} from "../controllers/AttendanceController.js";
import { verifyToken, authorizeRoles } from "../middleware/auth.js";
 
const router = express.Router();
router.use(verifyToken);
 
router.post("/clock-in",               authorizeRoles("EMPLOYEE"), clockIn);
router.put("/clock-out",               authorizeRoles("EMPLOYEE"), clockOut);
router.get("/my",                      authorizeRoles("EMPLOYEE"), getMyAttendance);
router.get("/",                        authorizeRoles("ADMIN", "MANAGER"), getAllAttendance);
router.get("/summary/:employeeId",     authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"), getAttendanceSummary);
 
export default router;