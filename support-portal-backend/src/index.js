require("dotenv").config();
const express = require("express");
require("./configuration/dbConfig");
const signupRoute = require("./routes/signup");
const loginRoute = require("./routes/login");
const userRoute = require("./routes/user");
const bodyParser = require("body-parser");
const cors = require("cors");
const createAdminAccount = require("./scripts/admin");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());
app.use(express.json());
app.use(cors({
    origin: [
      "http://localhost:3000",                      
      "https://support-desk-teal-nine.vercel.app"   
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  }));

createAdminAccount();

app.use("/user", signupRoute);
app.use("/auth",loginRoute);
app.use("/api",userRoute);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
