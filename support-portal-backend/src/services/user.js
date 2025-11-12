const User = require("../models/User");

async function getUsers() {
    const users = await User.find({})
    return users;
}

module.exports = {getUsers};