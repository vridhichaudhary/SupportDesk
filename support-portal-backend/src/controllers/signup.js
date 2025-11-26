const userService = require("../services/signup");

async function createdUser(req, res) {
    try {
        console.log("Signup request received:", req.body);
        
        const userData = req.body;
        
        if (!userData.name || !userData.email || !userData.password) {
            return res.status(400).json({ 
                message: "Name, email and password are required" 
            });
        }
        
        const user = await userService.createUser(userData);
        
        console.log("User created successfully:", user);
        
        res.status(201).json({
            user: user,
            message: "User created successfully"
        });
    } catch (error) {
        console.error("Signup error:", error);
        
        // Send specific error messages
        if (error.message === "Email already registered") {
            return res.status(400).json({ message: "Email already registered" });
        }
        
        res.status(400).json({ 
            message: error.message || "Failed to create account"
        });
    }
}

module.exports = { createdUser };