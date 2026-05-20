import FreelancerPayroll from "../models/FreelancerPayroll.js";
import Freelancer from "../models/Freelancer.js";
import Timesheet from "../models/Timesheet.js";

function getMonthRange(month) {
  const [year, mon] = String(month).split("-").map(Number);
  const from = new Date(year, mon - 1, 1);
  const to = new Date(year, mon, 0, 23, 59, 59);
  return { from, to };
}

function getCurrentMonthValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function validatePayrollMonth(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "")) {
    return "month must use YYYY-MM format";
  }

  if (month > getCurrentMonthValue()) {
    return "Freelancer payroll can only be generated for the current month or completed past months";
  }

  return "";
}

function buildPayrollNumber(freelancer, month) {
  const code = freelancer?._id?.toString().slice(-6).toUpperCase() || "UNKNOWN";
  return `FPAY-${String(month).replace("-", "")}-${code}`;
}

function calculateFreelancerPayrollForMonth({ freelancer, timesheets, month, generatedBy }) {
  const totalHours = timesheets.reduce((sum, t) => sum + Number(t.hours || 0), 0);
  const hourlyRate = freelancer.hourlyRate || 0;
  const grossPay = +(totalHours * hourlyRate).toFixed(2);
  const deductions = 0;
  const netPay = +(grossPay - deductions).toFixed(2);

  return {
    freelancer: freelancer._id,
    month,
    payrollNumber: buildPayrollNumber(freelancer, month),
    status: "GENERATED",
    grossPay,
    deductions,
    netPay,
    generatedBy,
    breakdown: {
      totalHours: +totalHours.toFixed(2),
      hourlyRate,
    },
  };
}

export const generateBulkFreelancerPayroll = async (req, res) => {
  try {
    const { month } = req.body;

    if (!month) {
      return res.status(400).json({ message: "month is required (format: YYYY-MM)" });
    }

    const monthError = validatePayrollMonth(month);
    if (monthError) {
      return res.status(400).json({ message: monthError });
    }

    const freelancers = await Freelancer.find();
    if (freelancers.length === 0) {
      return res.json({ message: "No freelancers found", results: [] });
    }

    const results = await Promise.allSettled(
      freelancers.map(async (freel) => {
        const existing = await FreelancerPayroll.findOne({ freelancer: frel._id, month });
        if (existing) {
          return { freelancerId: frel._id, status: "skipped", reason: "already exists" };
        }

        const { from, to } = getMonthRange(month);
        const timesheets = await Timesheet.find({
          freelancer: frel._id,
          date: { $gte: from, $lte: to },
          status: "APPROVED",
        });

        const payload = calculateFreelancerPayrollForMonth({
          freelancer: frel,
          timesheets,
          month,
          generatedBy: req.user.id,
        });

        await FreelancerPayroll.create(payload);
        return { freelancerId: frel._id, status: "generated", netPay: payload.netPay };
      })
    );

    const summary = {
      total: results.length,
      generated: results.filter((r) => r.value?.status === "generated").length,
      skipped: results.filter((r) => r.value?.status === "skipped").length,
      failed: results.filter((r) => r.status === "rejected").length,
    };

    res.json({ message: "Freelancer payroll generation completed", month, summary, results: results.map((r) => r.value || r.reason) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllFreelancerPayroll = async (req, res) => {
  try {
    const { month } = req.query;
    const filter = {};
    if (month) filter.month = month;

    const rows = await FreelancerPayroll
      .find(filter)
      .populate({
        path: "freelancer",
        populate: { path: "userId", select: "name email" },
      })
      .sort({ month: -1, createdAt: -1 });

    const serialized = rows.map((r) => {
      const doc = r.toObject ? r.toObject() : r;
      return {
        ...doc,
        freelancerName: doc.freelancer?.userId?.name || doc.freelancer?.name || "Freelancer",
      };
    });

    res.json(serialized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyFreelancerPayroll = async (req, res) => {
  try {
    // Find freelancer profile by userId
    const freelancer = await Freelancer.findOne({ userId: req.user.id });
    if (!freelancer) return res.status(404).json({ message: "Freelancer profile not found" });

    const rows = await FreelancerPayroll.find({ freelancer: freelancer._id })
      .sort({ month: -1, createdAt: -1 });

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

