//middlewares/protectRoute.js
import jwt from "jsonwebtoken";
import User from "../Models/userModel.js";

const protectRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return res.status(401).json({ message: "Unauthorized: No token provided." });
    }

    const decoded = jwt.verify(match[1], process.env.JWT_SECRET);
    if (!decoded.id) {
      return res.status(401).json({ message: "Unauthorized: Invalid token payload." });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found." });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("protectRoute error:", err);
    return res.status(401).json({ message: "Unauthorized: Invalid or expired token." });
  }
};

export default protectRoute;
