// src/controllers/oauthController.js
import axios from "axios";
import User from "./Models/userModel.js";
import generateTokenAndSetCookie from "../generateTokenandSetCookie.js";

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  CLIENT_URL
} = process.env;

// Step 1: Redirect user to Google’s OAuth consent screen
export const googleAuthRedirect = (req, res) => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: ["openid","profile","email"].join(" ")
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

// Step 2: Google calls us back here with ?code=…
export const googleAuthCallback = async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing code");
  try {
    // Exchange code for tokens
    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code,
        client_id:     GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri:  GOOGLE_REDIRECT_URI,
        grant_type:    "authorization_code"
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const { access_token } = tokenRes.data;

    // Fetch user info
    const userInfo = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const { id: googleId, name, email, picture: profilePic } = userInfo.data;

    // Upsert into Mongo
    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.create({ username: name, email, profilePic, googleId });
    }

    // Issue JWT cookie
    generateTokenAndSetCookie(user._id, res);

    // Redirect back to React
    res.redirect(`${CLIENT_URL}/profile/${user._id}`);
  } catch (err) {
    console.error("Google OAuth error:", err.response?.data || err);
    res.redirect(`${CLIENT_URL}/signin?error=oauth_failed`);
  }
};
