// src/generateTokenAndSetCookie.js
import jwt from "jsonwebtoken";

const generateTokenAndSetCookie = (userId, res) => {
  try {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: "20d",
    });
    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: 20 * 24 * 60 * 60 * 1000,
      sameSite:none,
      secure:true,
    });
    return token;
  } catch (error) {
    console.error("Error generating token:", error.message);
    throw new Error("Failed to generate token.");
  }
};

export default generateTokenAndSetCookie;
