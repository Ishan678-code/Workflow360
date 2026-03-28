import Invoice from "../models/Invoice.js";
import Timesheet from "../models/Timesheet.js";
import Freelancer from "../models/Freelancer.js";
import { getFreelancerProfileByUserId } from "../utils/profileRefs.js";

// F3.4 — Auto-generate invoice from approved timesheets
export const generateInvoice = async (req, res) => {
  try {
    const { freelancerId, projectId } = req.body;

    if (!freelancerId || !projectId) {
      return res.status(400).json({ message: "freelancerId and projectId are required" });
    }

    const freelancerProfile = await Freelancer.findOne({ userId: freelancerId });
    if (!freelancerProfile) {
      return res.status(404).json({ message: "Freelancer profile not found" });
    }

    const timesheets = await Timesheet.find({
      freelancer: freelancerId,
      project: projectId,
      status: "APPROVED"
    });

    if (timesheets.length === 0) {
      return res.status(400).json({ message: "No approved timesheets found for invoice generation" });
    }

    const totalHours = timesheets.reduce((sum, t) => sum + t.hours, 0);
    const amount = totalHours * (freelancerProfile.hourlyRate || 0);

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

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json({ message: "Invoice status updated", invoice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
