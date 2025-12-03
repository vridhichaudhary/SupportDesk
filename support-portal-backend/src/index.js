require("dotenv").config();
const express = require("express");
require("./configuration/dbConfig");

const signupRoute = require("./routes/signup");
const loginRoute = require("./routes/login");
const userRoute = require("./routes/user");
const ticketsRoute = require("./routes/tickets");
const adminAuthRoutes = require("./routes/adminAuth");
const adminRoutes = require("./routes/admin");
const seedAgents = require("./scripts/seedAgents");

const bodyParser = require("body-parser");
const cors = require("cors");
const createAdminAccount = require("./scripts/admin");
const adminRoute = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
    origin: [
        "http://localhost:3000",
        "https://support-desk-teal-nine.vercel.app"
    ],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});


app.use(bodyParser.json());
app.use(express.json());

createAdminAccount();

app.get("/", (req, res) => {
    res.json({ message: "Support Portal API Running" });
});

app.use("/user", signupRoute);
app.use("/auth", loginRoute);

app.use("/api", userRoute);

app.use("/tickets", ticketsRoute);

const adminAgentsRoute = require("./routes/adminAgents");
app.use("/admin/agents", adminAgentsRoute);

app.use("/admin", adminAuthRoutes);
app.use("/admin", adminRoutes);

app.use((err, req, res, next) => {
    console.error("Server Error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
});

seedAgents();

app.use("/admin", adminRoute);

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});
