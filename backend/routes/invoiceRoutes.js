// import express from "express";
// import {
//   generateInvoice,
//   getInvoices,
//   getInvoiceById,
//   updateInvoiceStatus
// } from "../controllers/InvoiceController.js";
// import { downloadInvoicePDF } from "../controllers/InvoicePdfController.js";

// import { verifyToken, authorizeRoles } from "../middleware/auth.js";

// const router = express.Router();

// router.use(verifyToken);

// router.post("/generate", authorizeRoles("ADMIN", "MANAGER"), generateInvoice);
// router.get("/", authorizeRoles("ADMIN", "MANAGER", "FREELANCER"), getInvoices);
// router.get("/:id", authorizeRoles("ADMIN", "MANAGER", "FREELANCER"), getInvoiceById);
// router.get("/:id/pdf", authorizeRoles("ADMIN", "MANAGER", "FREELANCER"), downloadInvoicePDF);
// router.put("/:id/status", authorizeRoles("ADMIN", "MANAGER"), updateInvoiceStatus);


// export default router;



import express from "express";
import {
  generateInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoiceStatus
} from "../controllers/InvoiceController.js";
import { downloadInvoicePDF } from "../controllers/InvoicePdfController.js";

import { verifyToken, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

router.use(verifyToken);

router.post("/generate", authorizeRoles("ADMIN", "MANAGER"), generateInvoice);
router.get("/", authorizeRoles("ADMIN", "MANAGER", "FREELANCER"), getInvoices);
router.get("/:id/pdf", authorizeRoles("ADMIN", "MANAGER", "FREELANCER"), downloadInvoicePDF);
router.get("/:id", authorizeRoles("ADMIN", "MANAGER", "FREELANCER"), getInvoiceById);
router.put("/:id/status", authorizeRoles("ADMIN", "MANAGER"), updateInvoiceStatus);

export default router;