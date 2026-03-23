import Role from "../models/Role.js";
import Employee from "../models/Employee.js";

// POST /api/roles
export const createRole = async (req, res) => {
  try {
    const { title, level } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Role title is required" });
    }

    const existing = await Role.findOne({ title });
    if (existing) {
      return res.status(400).json({ message: "Role already exists" });
    }

    const role = await Role.create({ title, level });
    res.status(201).json({ message: "Role created", role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/roles
export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ level: 1, title: 1 });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/roles/:id
export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/roles/:id
export const updateRole = async (req, res) => {
  try {
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.json({ message: "Role updated", role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/roles/:id
export const deleteRole = async (req, res) => {
  try {
    // Block deletion if employees are using this role as designation
    const inUse = await Employee.countDocuments({ designation: req.params.id });
    if (inUse > 0) {
      return res.status(400).json({
        message: `Cannot delete — ${inUse} employee(s) have this role as their designation`
      });
    }

    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.json({ message: "Role deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};