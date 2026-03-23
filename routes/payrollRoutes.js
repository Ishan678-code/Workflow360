import express from "express";
import {
  generatePayroll,
  generateBulkPayroll,
  getAllPayroll,
  getMyPayroll,
  getPayrollById
} from "../controllers/PayrollController.js";
import { verifyToken, authorizeRoles } from "../middleware/auth.js";
 
const router = express.Router();
router.use(verifyToken);
 
router.post("/generate",       authorizeRoles("ADMIN"), generatePayroll);
router.post("/generate-bulk",  authorizeRoles("ADMIN"), generateBulkPayroll);
router.get("/",                authorizeRoles("ADMIN", "MANAGER"), getAllPayroll);
router.get("/my",              authorizeRoles("EMPLOYEE"), getMyPayroll);
router.get("/:id",             authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"), getPayrollById);
 
export default router;