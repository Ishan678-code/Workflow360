import express from "express";
import { generateBulkFreelancerPayroll, getAllFreelancerPayroll, getMyFreelancerPayroll } from "../controllers/FreelancerPayrollController.js";
import { verifyToken, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();
router.use(verifyToken);

router.post("/generate-bulk", authorizeRoles("ADMIN"), generateBulkFreelancerPayroll);
router.get("/", authorizeRoles("ADMIN"), getAllFreelancerPayroll);
router.get("/my", authorizeRoles("FREELANCER"), getMyFreelancerPayroll);

export default router;

