import Department from "../models/Department.js";
import Employee from "../models/Employee.js";

// POST /api/departments
export const createDepartment = async (req, res) => {
  try {
    const { name, description, head, code, parentDepartment, location } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Department name is required" });
    }

    const existing = await Department.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Department already exists" });
    }

    const department = await Department.create({
      name,
      description,
      head,
      code,
      parentDepartment: parentDepartment || null,
      location
    });
    res.status(201).json({ message: "Department created", department });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/departments
export const getDepartments = async (req, res) => {
  try {
    const departments = await Department
      .find()
      .populate("head", "name email")
      .populate("parentDepartment", "name code")
      .sort({ name: 1 });

    const childrenMap = departments.reduce((map, department) => {
      const parentId = department.parentDepartment?._id
        ? String(department.parentDepartment._id)
        : null;
      if (!parentId) return map;
      map[parentId] = (map[parentId] || 0) + 1;
      return map;
    }, {});

    // Attach headcount to each department
    const enriched = await Promise.all(
      departments.map(async (dept) => {
        const headcount = await Employee.countDocuments({ department: dept._id });
        return {
          ...dept.toObject(),
          headcount,
          divisionCount: childrenMap[String(dept._id)] || 0
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/departments/:id
export const getDepartmentById = async (req, res) => {
  try {
    const department = await Department
      .findById(req.params.id)
      .populate("head", "name email")
      .populate("parentDepartment", "name code");

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Get all employees in this department
    const employees = await Employee
      .find({ department: req.params.id })
      .populate("userId", "name email")
      .populate("designation")
      .populate("manager", "name email");

    const divisions = await Department
      .find({ parentDepartment: req.params.id })
      .populate("head", "name email")
      .sort({ name: 1 });

    res.json({ ...department.toObject(), employees, divisions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/departments/:id
export const updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("head", "name email");

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json({ message: "Department updated", department });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/departments/:id
export const deleteDepartment = async (req, res) => {
  try {
    // Block deletion if employees are still assigned
    const headcount = await Employee.countDocuments({ department: req.params.id });
    if (headcount > 0) {
      return res.status(400).json({
        message: `Cannot delete — ${headcount} employee(s) still assigned to this department`
      });
    }

    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json({ message: "Department deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
