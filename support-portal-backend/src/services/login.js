const bcrypt = require("bcrypt");
const User = require("../models/User");
const { generateToken } = require("../utils/jwtUtils");
const { verifyToken } = require("../utils/authMiddleware");

async function login(email, password) {
  const existingUser = await User.findOne({ email });

  if (!existingUser) {
    throw new Error("User not found");
  }

  const isPasswordValid = await bcrypt.compare(password, existingUser.password);
  if (!isPasswordValid) {
    throw new Error("Invalid Password");
  }

  const token = generateToken(existingUser);

  return {
    token,
    user: {
      id: existingUser._id,
      name: existingUser.name,
      email: existingUser.email,
      role: existingUser.role,
    },
  };
}

async function refreshToken(oldToken) {
  try {
    const decoded = verifyToken(oldToken);

    const user = await User.findById(decoded.id);
    if (!user) throw new Error("User not found");

    const newToken = generateToken(user);
    return newToken;

  } catch (error) {
    throw new Error("Invalid token");
  }
}

module.exports = { login, refreshToken };
