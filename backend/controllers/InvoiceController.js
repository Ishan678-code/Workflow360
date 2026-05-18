import Invoice from "../models/Invoice.js";
import Timesheet from "../models/Timesheet.js";
import Freelancer from "../models/Freelancer.js";
import Project from "../models/Project.js";
import { getFreelancerProfileByUserId } from "../utils/profileRefs.js";
async function canManageProject(user, projectId) {

  if (user.role === "ADMIN") return true;
  const project = await Project.findById(projectId).select("manager ownerManager");
  if (!project) return false;
  return [project.manager, project.ownerManager].some((id) => id?.toString() === user.id);
}

// F3.4 — Auto-generate invoice from approved timesheets
export const generateInvoice = async (req, res) => {
  try {
    const { freelancerId, projectId } = req.body;

    if (!freelancerId || !projectId) {
      return res.status(400).json({ message: "freelancerId and projectId are required" });
    }

    if (!(await canManageProject(req.user, projectId))) {
      return res.status(403).json({ message: "You can only generate invoices for projects you manage" });
    }

    const freelancerProfile = await Freelancer.findById(freelancerId);
    if (!freelancerProfile) {
      return res.status(404).json({ message: "Freelancer profile not found" });
    }

    const assignedProject = await Project.findOne({ _id: projectId, freelancers: freelancerProfile._id });
    if (!assignedProject) {
      return res.status(400).json({ message: "Freelancer is not assigned to this project" });
    }

    const timesheets = await Timesheet.find({
      freelancer: freelancerProfile._id,
      project: projectId,
      status: "APPROVED"
    });

    if (timesheets.length === 0) {
      return res.status(400).json({ message: "No approved timesheets found for invoice generation" });
    }

    const totalHours = timesheets.reduce((sum, t) => sum + t.hours, 0);
    const amount = totalHours * (freelancerProfile.hourlyRate || 0);

    const existingInvoice = await Invoice.findOne({
      freelancer: freelancerProfile._id,
      project: projectId,
      status: { $ne: "CANCELLED" }
    });
    if (existingInvoice) {
      return res.status(400).json({ message: "An active invoice already exists for this freelancer and project" });
    }

    const invoice = await Invoice.create({
      freelancer: freelancerProfile._id,
      project: projectId,
      totalHours,
      amount,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      status: "PENDING"
    });

    res.status(201).json({ message: "Invoice generated", invoice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "FREELANCER") {
      const freelancerProfile = await getFreelancerProfileByUserId(req.user.id);
      if (!freelancerProfile) {
        return res.status(404).json({ message: "Freelancer profile not found" });
      }
      filter.freelancer = freelancerProfile._id;
    }
    if (req.user.role === "MANAGER") {
      const managedProjects = await Project.find({
        $or: [{ manager: req.user.id }, { ownerManager: req.user.id }]
      }).select("_id");
      filter.project = { $in: managedProjects.map((project) => project._id) };
    }

    const { status } = req.query;
    if (status) filter.status = status;

    const invoices = await Invoice
      .find(filter)
      .populate({ path: "freelancer", populate: { path: "userId", select: "name email" } })
      .populate("project", "name")
      .sort({ createdAt: -1 });

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice
      .findById(req.params.id)
      .populate({ path: "freelancer", populate: { path: "userId", select: "name email" } })
      .populate("project", "name");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (req.user.role === "FREELANCER") {
      const freelancerProfile = await getFreelancerProfileByUserId(req.user.id);
      if (!freelancerProfile || invoice.freelancer?._id?.toString() !== freelancerProfile._id.toString()) {
        return res.status(403).json({ message: "You can only view your own invoices" });
      }
    }

    if (req.user.role === "MANAGER" && !(await canManageProject(req.user, invoice.project?._id || invoice.project))) {
      return res.status(403).json({ message: "You can only view invoices for projects you manage" });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateInvoiceStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["PENDING", "PAID", "CANCELLED"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (!(await canManageProject(req.user, invoice.project))) {
      return res.status(403).json({ message: "You can only update invoices for projects you manage" });
    }

    invoice.status = status;
    await invoice.save();

    res.json({ message: "Invoice status updated", invoice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
