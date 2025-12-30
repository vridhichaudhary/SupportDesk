require("dotenv").config();
const express = require("express");
require("./configuration/dbConfig");

const signupRoute = require("./routes/signup");
const loginRoute = require("./routes/login");
const userRoute = require("./routes/user");
const ticketsRoute = require("./routes/tickets");
const adminAuthRoutes = require("./routes/adminAuth");
const adminRoutes = require("./routes/admin");
const adminAgentsRoute = require("./routes/adminAgents");

const seedAgents = require("./scripts/seedAgents");
const createAdminAccount = require("./scripts/admin");

const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 8080;

// const allowedOrigins = [
//     "http://localhost:3000",
//     process.env.FRONTEND_URL,
// ];

// app.use(cors({
//     origin: allowedOrigins,
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"]
// }));

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:3000",
      "https://support-desk-teal-nine.vercel.app",
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(bodyParser.json());
app.use(express.json());

createAdminAccount();
seedAgents();

app.get("/", (req, res) => {
  res.json({ message: "Support Portal API Running" });
});

app.use("/user", signupRoute);
app.use("/auth", loginRoute);

app.use("/api", userRoute);
app.use("/tickets", ticketsRoute);

app.use("/admin/auth", adminAuthRoutes);
app.use("/admin", adminRoutes);
app.use("/admin/agents", adminAgentsRoute);

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
