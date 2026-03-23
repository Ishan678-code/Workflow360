import express from "express";
import {
  uploadDocument,
  getDocuments,
  getDocumentById,
  updateDocumentAccess,
  deleteDocument
} from "../controllers/DocumentController.js";
import { verifyToken, authorizeRoles } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
 
const router6 = express.Router();
router6.use(verifyToken);
 
router6.post("/upload",  authorizeRoles("ADMIN", "MANAGER"), upload.single("file"), uploadDocument);
router6.get("/",         authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE", "FREELANCER"), getDocuments);
router6.get("/:id",      authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE", "FREELANCER"), getDocumentById);
router6.put("/:id",      authorizeRoles("ADMIN", "MANAGER"), updateDocumentAccess);
router6.delete("/:id",   authorizeRoles("ADMIN", "MANAGER"), deleteDocument);
 
export default router6;