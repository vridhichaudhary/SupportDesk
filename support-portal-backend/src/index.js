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

const http = require("http");
const { initSocket } = require("./socket");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

// Initialize Socket.io
initSocket(server);

app.use(cors({
    origin: ["http://localhost:3000", "https://support-desk-teal-nine.vercel.app"],
    credentials: true
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

server.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});
