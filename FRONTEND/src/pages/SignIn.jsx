// src/pages/SignIn.jsx
import { useState } from "react";
import "../styles/Auth.css";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SignIn = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errorMessages, setErrorMessages] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const safeJson = async (res) => {
    const text = await res.text();
    if (text) {
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error("safeJson parse error:", e, "Raw response:", text);
        console.error("Invalid JSON:", text);
        return { raw: text };
      }
    }
    return {};
  };

  const handleChange = (e) =>
    setFormData((p) => ({ ...p, [e.target.id]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessages([]);
    setSuccessMessage("");
    setLoading(true);

    if (!formData.email || !formData.password) {
      setErrorMessages(["All fields are required!"]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });
      const data = await safeJson(res);
      console.log("LOGIN RAW:", data);

      if (res.ok) {
        setSuccessMessage("Sign-in successful! Redirecting...");
        const userWithTime = { ...data, loginTime: Date.now() };
        localStorage.setItem("user-verse", JSON.stringify(userWithTime));
        localStorage.setItem("lastLogin", Date.now().toString());
        setUser(userWithTime);
        navigate(`/profile/${data._id}`);
      } else {
        setErrorMessages([data.message || "Something went wrong."]);
      }
    } catch (err) {
      setErrorMessages([err.message || "An error occurred."]);
    }

    setLoading(false);
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
              {errorMessages.map((e, i) => (
                <p key={i} className="error">{e}</p>
              ))}
            </div>
          )}
          {successMessage && <p className="success">{successMessage}</p>}
          <button
            type="submit"
            className="signup-btn"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="redirect">
          Dont have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default SignIn;
