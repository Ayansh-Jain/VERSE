// src/pages/SignUp.jsx
import { useState } from "react";
import "../styles/Auth.css";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";

const OAUTH_BASE = import.meta.env.VITE_API_BASE_URL || "https://verse-48io.onrender.com";

const idOf = (u) => {
  if (typeof u === "string") return u;
  if (u?._id) return u._id;
  return String(u);
};

const SignUp = () => {
  const { setUser } = useAuth();
  const navigate     = useNavigate();

  const [formData, setFormData] = useState({
    username:       "",
    email:          "",
    password:       "",
    confirmPassword:"",
  });
  const [errorMessages, setErrorMessages] = useState([]);
  const [loading, setLoading]           = useState(false);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessages([]);

    const errs = [];
    if (!formData.username || !formData.email || !formData.password) {
      errs.push("All fields are required!");
    }
    if (formData.password !== formData.confirmPassword) {
      errs.push("Passwords do not match!");
    }
    if (errs.length) {
      setErrorMessages(errs);
      return;
    }

    setLoading(true);
    try {
      const response = await api.signup({
        username: formData.username,
        email:    formData.email,
        password: formData.password,
      });

      const { token, following = [], followers = [], ...apiUser } = response;

      // filter out null/undefined before mapping
      const followingClean = Array.isArray(following)
        ? following.filter((x) => x != null).map(idOf)
        : [];
      const followersClean = Array.isArray(followers)
        ? followers.filter((x) => x != null).map(idOf)
        : [];

      const normalized = {
        ...apiUser,
        token,
        following: followingClean,
        followers: followersClean,
      };

      localStorage.setItem("verse_token", token);
      localStorage.setItem("verse_user", JSON.stringify(normalized));
      setUser(normalized);

      navigate(`/profile/${apiUser._id}`);
    } catch (err) {
      console.error("SignUp error:", err);
      setErrorMessages([err.message || "Sign-up failed."]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <h2 className="signup-title">Sign Up</h2>
        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              name="username"
              id="username"
              type="text"
              placeholder="Enter your username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              name="email"
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              name="password"
              id="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              name="confirmPassword"
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          {errorMessages.length > 0 && (
            <div className="error-messages">
              {errorMessages.map((msg, idx) => (
                <p key={idx} className="error">{msg}</p>
              ))}
            </div>
          )}

          <button type="submit" className="signup-btn" disabled={loading}>
            {loading ? "Signing up..." : "Sign Up"}
          </button>

          {/* OAuth Buttons */}
          <div className="oauth-buttons">
            <button
              type="button"
              className="oauth-btn google"
              onClick={() => window.location.href = `${OAUTH_BASE}/auth/google`}
            >
              Sign Up with Google
            </button>
            <button
              type="button"
              className="oauth-btn facebook"
              onClick={() => window.location.href = `${OAUTH_BASE}/auth/facebook`}
            >
              Sign Up with Facebook
            </button>
            <button
              type="button"
              className="oauth-btn twitter"
              onClick={() => window.location.href = `${OAUTH_BASE}/auth/twitter`}
            >
              Sign Up with Twitter
            </button>
          </div>

          <p className="redirect">
            Already have an account? <Link to="/signin">Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
