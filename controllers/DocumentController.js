import Document from "../models/Document.js";
import path from "path";
import fs from "fs";

// POST /api/documents/upload
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { accessRoles } = req.body;

    // Parse accessRoles — can come as JSON string or array
    let parsedRoles = ["ADMIN"];
    if (accessRoles) {
      try {
        parsedRoles = typeof accessRoles === "string"
          ? JSON.parse(accessRoles)
          : accessRoles;
      } catch {
        parsedRoles = [accessRoles];
      }
    }

    const validRoles = ["ADMIN", "MANAGER", "EMPLOYEE", "FREELANCER"];
    const invalidRoles = parsedRoles.filter(r => !validRoles.includes(r));
    if (invalidRoles.length > 0) {
      return res.status(400).json({ message: `Invalid roles: ${invalidRoles.join(", ")}` });
    }

    const document = await Document.create({
      owner       : req.user.id,
      filename    : req.file.originalname,
      url         : `/uploads/${req.file.filename}`,
      accessRoles : parsedRoles
    });

    res.status(201).json({ message: "Document uploaded", document });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/documents  — only returns docs the user has access to
export const getDocuments = async (req, res) => {
  try {
    const { role, id } = req.user;

    const filter = role === "ADMIN"
      ? {}                                      // ADMIN sees everything
      : { accessRoles: role };                  // others see only their role's docs

    const documents = await Document
      .find(filter)
      .populate("owner", "name email")
      .sort({ createdAt: -1 });

    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/documents/:id
export const getDocumentById = async (req, res) => {
  try {
    const document = await Document
      .findById(req.params.id)
      .populate("owner", "name email");

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Check access
    const { role, id } = req.user;
    const isOwner      = document.owner._id.toString() === id;
    const hasAccess    = document.accessRoles.includes(role);

    if (!isOwner && !hasAccess && role !== "ADMIN") {
      return res.status(403).json({ message: "You do not have access to this document" });
    }

    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/documents/:id  (owner or ADMIN can update access roles)
export const updateDocumentAccess = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const isOwner = document.owner.toString() === req.user.id;
    if (!isOwner && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only the owner or admin can update access" });
    }

    const { accessRoles, filename } = req.body;
    if (accessRoles) document.accessRoles = accessRoles;
    if (filename)    document.filename    = filename;

    await document.save();
    res.json({ message: "Document updated", document });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/documents/:id  (owner or ADMIN)
export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const isOwner = document.owner.toString() === req.user.id;
    if (!isOwner && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only the owner or admin can delete this document" });
    }

    // Remove physical file from disk
    const filePath = path.join(process.cwd(), "public", document.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: "Document deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};