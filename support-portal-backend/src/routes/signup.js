const express = require("express");
const cors = require("cors");
const signupController = require("../controllers/signup");

const router = express.Router();

// Enable CORS for this route
router.use(cors({
  origin: [
    "http://localhost:3000",
    "https://support-desk-teal-nine.vercel.app"
  ],
  credentials: true,
  methods: ["POST", "OPTIONS"]
}));

router.post("/register", signupController.createdUser);

module.exports = router;