const {getUsers} = require("../services/user");

async function getUser(req,res) {
    try{
        const users = await getUsers();
        res.json(users)
    }catch(error){
        res.status(500).json({message:error})
    }
}

module.exports = {getUser};