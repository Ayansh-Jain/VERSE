// routes/authRoutes.js
import express from "express";
import passport from "passport";
// … initialize strategies …
const router = express.Router();

router.get("/google", passport.authenticate("google", { scope: ["profile","email"] }));
// … other /auth routes …

export default router;
