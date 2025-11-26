const User = require("../models/User");
const bcrypt = require("bcrypt");

async function createUser(userData) {
  const { name, email, password, role } = userData;

  if (!name || !email || !password) {
    throw new Error("name, email and password are required");
  }

  // Default to user role
  let finalRole = "user";

  // Allow admin role ONLY if explicitly requested
  if (role && role === "admin") {
    finalRole = "admin";
  }

  const exists = await User.findOne({ email });
  if (exists) throw new Error("Email already registered");

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    name,
    email,
    password: hashedPassword,
    role: finalRole,
  });

  const saved = await user.save();

  return {
    id: saved._id,
    name: saved.name,
    email: saved.email,
    role: saved.role
  };
}

module.exports = { createUser };