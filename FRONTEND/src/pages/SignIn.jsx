// src/pages/SignIn.jsx
import { useState } from "react";
import "../styles/Auth.css";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
const idOf = (u) => {
  if (typeof u === "string") return u;
  if (u?._id) return u._id;
  // For Mongoose ObjectId
  return u.toString();
};
const SignIn = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errorMessages, setErrorMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Update form state
  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessages([]);

    // Basic validation
    if (!formData.email || !formData.password) {
      setErrorMessages(["All fields are required!"]);
      return;
    }

    setLoading(true);
    try {
      // 1) Destructure exactly what the API returns
      const { token, user: apiUser } = await api.login({
        email: formData.email,
        password: formData.password,
      });

      // 2) Normalize followers & following to arrays of ID strings
      const normalized = {
             ...apiUser,
             token,
             following: (apiUser.following || []).map(idOf),
             followers: (apiUser.followers || []).map(idOf),
         };

      // 3) Persist to localStorage and update context
      localStorage.setItem("verse_token", token);
      localStorage.setItem("verse_user", JSON.stringify(normalized));
      setUser(normalized);

      // 4) Navigate to profile
      navigate(`/profile/${apiUser._id}`);
    } catch (err) {
      console.error("SignIn error:", err);
      setErrorMessages([err.message || "Sign in failed."]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <h2 className="signup-title">Sign In</h2>
        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
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
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="redirect">
          Don’t have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default SignIn;
