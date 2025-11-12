const User = require("../models/User");
const bcrypt = require("bcrypt");

async function createAdminAccount() {
    try{
        const existingAdmin = await User.findOne({email : "admin@test.com"})
        if (!existingAdmin){
            const newAdmin = new User({
                email: "admin@test.com",
                name:"Admin",
                password: await bcrypt.hash("admin",10),
                role:"admin"
            })
            await newAdmin.save();
            console.log("Admin created successfully")
        }else{
            console.log("Admin Already Exists")
        }
    }catch(error){
        console.error("Error:",error)
    }
}

module.exports = createAdminAccount;