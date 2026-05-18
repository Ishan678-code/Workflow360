import Invoice from "../models/Invoice.js";
import { getFreelancerProfileByUserId } from "../utils/profileRefs.js";
import Project from "../models/Project.js";
import { generateInvoicePDF } from "../services/invoicePdfService.js";

async function canManageProject(user, projectId) {
  if (user.role === "ADMIN") return true;
  const project = await Project.findById(projectId).select("manager ownerManager");
  if (!project) return false;
  return [project.manager, project.ownerManager].some((id) => id?.toString() === user.id);
}

export const downloadInvoicePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate({ path: "freelancer", populate: { path: "userId", select: "name email" } })
      .populate("project", "name");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (req.user.role === "FREELANCER") {
      const freelancerProfile = await getFreelancerProfileByUserId(req.user.id);
      if (!freelancerProfile || invoice.freelancer?._id?.toString() !== freelancerProfile._id.toString()) {
        return res.status(403).json({ message: "You can only download your own invoices" });
      }
    }

    if (req.user.role === "MANAGER") {
      const projectId = invoice.project?._id || invoice.project;
      if (!(await canManageProject(req.user, projectId))) {
        return res.status(403).json({ message: "You can only download invoices for projects you manage" });
      }
    }

    // ADMIN can access all

    const freelancer = invoice.freelancer;
    const project = invoice.project;

    const pdfBuffer = await generateInvoicePDF(invoice, freelancer, project);

    const invoiceNumber = invoice.invoiceNumber || invoice._id?.toString()?.slice(-6)?.toUpperCase() || "DRAFT";
    const filename = `invoice-${invoiceNumber}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

