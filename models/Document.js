import mongoose from "mongoose";

export const documentSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  filename: String,
  url: String,
  accessRoles: [String]
}, { timestamps: true });

export default mongoose.model("Document", documentSchema);
