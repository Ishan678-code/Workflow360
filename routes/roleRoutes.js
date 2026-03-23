import express from "express";
import {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole
} from "../controllers/RoleController.js";
import { verifyToken, authorizeRoles } from "../middleware/auth.js";
 
const router4 = express.Router();
router4.use(verifyToken);
 
router4.post("/",    authorizeRoles("ADMIN"), createRole);
router4.get("/",     authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"), getRoles);
router4.get("/:id",  authorizeRoles("ADMIN", "MANAGER"), getRoleById);
router4.put("/:id",  authorizeRoles("ADMIN"), updateRole);
router4.delete("/:id", authorizeRoles("ADMIN"), deleteRole);
 
export default router4;