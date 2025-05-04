// src/pages/SignUp.jsx
import { useState } from "react";
import "../styles/Auth.css";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";

const SignUp = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errorMessages, setErrorMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessages([]);

    const errors = [];
    if (!formData.username || !formData.email || !formData.password) {
      errors.push("All fields are required!");
    }
    if (formData.password !== formData.confirmPassword) {
      errors.push("Passwords do not match!");
    }
    if (errors.length) {
      setErrorMessages(errors);
      return;
    }

    setLoading(true);
    try {
      const { token, user } = await api.signup({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      // Persist and update context
      localStorage.setItem("verse_token", token);
      localStorage.setItem("verse_user", JSON.stringify(user));
      setUser({
        ...user,
        token,
        following: (user.following || []).map((u) => u._id),
        followers: (user.followers || []).map((u) => u._id),
      });

      navigate(`/profile/${user._id}`);
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

          <p className="redirect">
            Already have an account? <Link to="/signin">Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
