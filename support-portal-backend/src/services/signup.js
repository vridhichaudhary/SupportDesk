const User = require("../models/User");
const bcrypt = require("bcrypt");

async function createUser(userData){
    const {name,email,password} = userData;
    const hashedPassword = await bcrypt.hash(password,10);
    const user = new User ({
        name,
        email,
        password: hashedPassword,
        role:"customer",
    })
    const savedUser = await user.save();
    return savedUser
}

module.exports = {createUser};