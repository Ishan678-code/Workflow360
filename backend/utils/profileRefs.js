import Employee from "../models/Employee.js";
import Freelancer from "../models/Freelancer.js";

export async function getEmployeeProfileByUserId(userId) {
  if (!userId) return null;
  return Employee.findOne({ userId });
}

export async function getFreelancerProfileByUserId(userId) {
  if (!userId) return null;
  return Freelancer.findOne({ userId });
}
