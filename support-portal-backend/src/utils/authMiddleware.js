const jwt = require("jsonwebtoken");
const {secretKey} = require("../configuration/jwtConfig");

function authenticateToken(req,res,next){
    const authHeader = req.header("Authorization")
    if(!authHeader){
        return res.status(401).json({message: "Unauthorised:Missing token!"})
    }
    const [bearer,token] = authHeader.split(" ")
    if (bearer !== "Bearer" || !token){
        return res.status(401).json({message: "Unauthorised:Invalid token format!"});
    }

    try {
    const user = jwt.verify(token, secretKey);
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Forbidden: Invalid token!", err });
  }
}

function verifyToken(token){
    return jwt.verify(token,secretKey)
}

module.exports = {authenticateToken,verifyToken}