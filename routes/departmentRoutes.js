import express from "express";
import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
} from "../controllers/DepartmentController.js";
import { verifyToken, authorizeRoles } from "../middleware/auth.js";
 
const router = express.Router();
router.use(verifyToken);
 
router.post("/",    authorizeRoles("ADMIN"), createDepartment);
router.get("/",     authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"), getDepartments);
router.get("/:id",  authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"), getDepartmentById);
router.put("/:id",  authorizeRoles("ADMIN"), updateDepartment);
router.delete("/:id", authorizeRoles("ADMIN"), deleteDepartment);
 
export default router;