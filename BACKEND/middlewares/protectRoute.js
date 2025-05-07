// src/middlewares/protectRoute.js

import jwt from "jsonwebtoken";
import User from "../Models/userModel.js";

/**
 * Middleware to protect routes by verifying a Bearer JWT
 * and loading the user (lean, no password) into req.user.
 */
export default async function protectRoute(req, res, next) {
  try {
    // 1) Check Authorization header
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ message: "Unauthorized: No token provided." });
    }
    const parts = auth.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({ message: "Unauthorized: Invalid token format." });
    }
    const token = parts[1];

    // 2) Verify token (synchronously)
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Unauthorized: Token invalid or expired." });
    }

    // 3) Ensure payload has an id
    const userId = payload.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Invalid token payload." });
    }

    // 4) Load user from DB (lean, exclude password)
    const user = await User.findById(userId)
      .select("-password")
      .lean()
      .exec();

    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found." });
    }

    // 5) Attach to req and proceed
    req.user = user;
    next();

  } catch (err) {
    console.error("protectRoute error:", err);
    res.status(500).json({ message: "Server error during authentication." });
  }
}
