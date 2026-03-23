// import User from "../models/User.js";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";

// export const register = async (req, res) => {
//   try {
//     const { name, email, password, role } = req.body;

//     if (!name || !email || !password || !role) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     const validRoles = ["ADMIN", "MANAGER", "EMPLOYEE", "FREELANCER"];
//     if (!validRoles.includes(role)) {
//       return res.status(400).json({ message: "Invalid role" });
//     }

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ message: "User already exists" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const user = await User.create({ name, email, password: hashedPassword, role });

//     const { password: _, ...safeUser } = user.toObject();

//     res.status(201).json({ message: "User registered successfully", user: safeUser });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// export const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ message: "Email and password are required" });
//     }

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     if (!user.isActive) {
//       return res.status(403).json({ message: "Account is deactivated" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     const token = jwt.sign(
//       { id: user._id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: "1d" }
//     );

//     const { password: _, ...safeUser } = user.toObject();

//     res.json({ message: "Login successful", token, user: safeUser });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// export const logout = async (req, res) => {
//   res.json({ message: "Logout successful" });
// };

// export const getMe = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id).select("-password");
//     res.json(user);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };



import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";

// POST /api/attendance/clock-in
export const clockIn = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Prevent double clock-in on same day
    const existing = await Attendance.findOne({
      employee: req.user.id,
      date: { $gte: today }
    });

    if (existing?.clockIn) {
      return res.status(400).json({ message: "Already clocked in today" });
    }

    const attendance = await Attendance.create({
      employee : req.user.id,
      date     : new Date(),
      clockIn  : new Date()
    });

    res.status(201).json({ message: "Clocked in successfully", attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/attendance/clock-out
export const clockOut = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee : req.user.id,
      date     : { $gte: today }
    });

    if (!attendance) {
      return res.status(400).json({ message: "You have not clocked in today" });
    }
    if (attendance.clockOut) {
      return res.status(400).json({ message: "Already clocked out today" });
    }

    attendance.clockOut = new Date();
    await attendance.save();

    // Compute hours worked
    const hoursWorked = +((attendance.clockOut - attendance.clockIn) / 36e5).toFixed(2);

    res.json({ message: "Clocked out successfully", hoursWorked, attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/attendance/my
export const getMyAttendance = async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = { employee: req.user.id };

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)   filter.date.$lte = new Date(to);
    }

    const records = await Attendance.find(filter).sort({ date: -1 });

    // Attach hours worked to each record
    const enriched = records.map(r => ({
      ...r.toObject(),
      hoursWorked: r.clockIn && r.clockOut
        ? +((r.clockOut - r.clockIn) / 36e5).toFixed(2)
        : null
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/attendance  (ADMIN/MANAGER)
export const getAllAttendance = async (req, res) => {
  try {
    const { employeeId, from, to } = req.query;
    const filter = {};

    if (employeeId) filter.employee = employeeId;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)   filter.date.$lte = new Date(to);
    }

    const records = await Attendance
      .find(filter)
      .populate("employee")
      .sort({ date: -1 });

    const enriched = records.map(r => ({
      ...r.toObject(),
      hoursWorked: r.clockIn && r.clockOut
        ? +((r.clockOut - r.clockIn) / 36e5).toFixed(2)
        : null
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/attendance/summary/:employeeId  (monthly summary)
export const getAttendanceSummary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;

    const now     = new Date();
    const m       = parseInt(month) || now.getMonth() + 1;
    const y       = parseInt(year)  || now.getFullYear();
    const from    = new Date(y, m - 1, 1);
    const to      = new Date(y, m, 0, 23, 59, 59);

    const records = await Attendance.find({
      employee : employeeId,
      date     : { $gte: from, $lte: to }
    });

    const totalDays      = records.length;
    const presentDays    = records.filter(r => r.clockIn).length;
    const completedDays  = records.filter(r => r.clockIn && r.clockOut).length;
    const totalHours     = records.reduce((sum, r) => {
      if (r.clockIn && r.clockOut) {
        return sum + (r.clockOut - r.clockIn) / 36e5;
      }
      return sum;
    }, 0);

    res.json({
      employeeId,
      period: `${y}-${String(m).padStart(2, "0")}`,
      totalDays,
      presentDays,
      completedDays,
      totalHoursWorked : +totalHours.toFixed(2),
      avgHoursPerDay   : completedDays > 0
        ? +(totalHours / completedDays).toFixed(2)
        : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};