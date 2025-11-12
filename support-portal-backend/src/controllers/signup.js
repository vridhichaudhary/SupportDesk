const userService = require("../services/signup");

async function createdUser(req,res){
    try{
        const userData = req.body
        const user = await userService.createUser(userData)
        res.status(201).json({user: user,message: "User created successfully"})
    }
    catch(error){
        console.log(error)
        res.status(400).json({message: error.message})
    }
}

module.exports = {createdUser};