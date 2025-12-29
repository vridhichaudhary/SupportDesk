const User = require("../models/User");
const mongoose = require("mongoose");
require("dotenv").config();
require("../configuration/dbConfig");

async function checkUser() {
    try {
        console.log("Checking for user: naitik@gmail.com");
        const user = await User.findOne({ email: "naitik@gmail.com" });
        if (user) {
            console.log("User found:", user);
        } else {
            console.log("User NOT found.");
        }

        console.log("Check complete.");
        process.exit();
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

// Give DB time to connect
setTimeout(checkUser, 2000);
