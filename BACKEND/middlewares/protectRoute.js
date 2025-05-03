// src/middlewares/protectRoute.js
import jwt from "jsonwebtoken";
import User from "../Models/userModel.js";

const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Invalid token payload" });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("protectRoute error:", error);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

export default protectRoute;
