import express from "express";
import {
  createReview,
  getAllReviews,
  getMyReviews,
  getReviewSummary,
  updateReview,
  deleteReview
} from "../controllers/PerformancereviewController.js";
import { verifyToken, authorizeRoles } from "../middleware/auth.js";
 
const router5 = express.Router();
router5.use(verifyToken);
 
router5.post("/",                   authorizeRoles("ADMIN", "MANAGER"), createReview);
router5.get("/",                    authorizeRoles("ADMIN", "MANAGER"), getAllReviews);
router5.get("/my",                  authorizeRoles("EMPLOYEE", "FREELANCER"), getMyReviews);
router5.get("/summary/:userId",     authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE", "FREELANCER"), getReviewSummary);
router5.put("/:id",                 authorizeRoles("ADMIN", "MANAGER"), updateReview);
router5.delete("/:id",              authorizeRoles("ADMIN"), deleteReview);
 
export default router5;