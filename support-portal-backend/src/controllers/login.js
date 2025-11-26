const authService = require("../services/login");

async function login(req, res) {
  try {
    const { email, password } = req.body;

    const { token, user } = await authService.login(email, password);

    return res.status(200).json({
      token,
      user,
    });

  } catch (error) {
    console.error("Login Error:", error.message);
    return res.status(401).json({ message: "Invalid credentials" });
  }
}

async function refreshToken(req, res) {
  try {
    const { token } = req.body;
    const newToken = await authService.refreshToken(token);
    return res.json({ newToken });
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

module.exports = { login, refreshToken };