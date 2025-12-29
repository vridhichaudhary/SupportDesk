const User = require("../models/User");
const bcrypt = require("bcrypt");
require("dotenv").config();
require("../configuration/dbConfig");

async function resetPassword() {
    try {
        console.log("Resetting password for: naitik@gmail.com");
        const user = await User.findOne({ email: "naitik@gmail.com" });
        if (user) {
            const hashedPassword = await bcrypt.hash("password123", 10);
            user.password = hashedPassword;
            await user.save();
            console.log("Password reset to 'password123' successfully.");
        } else {
            console.log("User NOT found.");
        }
        process.exit();
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

setTimeout(resetPassword, 2000);
