// src/pages/SignUp.jsx
import { useState } from "react";
import "../styles/Auth.css";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SignUp = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
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
      } catch (err) {
        console.error(err);
        console.error("Invalid JSON:", text);
        return { raw: text };
      }
    }
    return {};
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessages([]);
    setSuccessMessage("");
    setLoading(true);

    let errors = [];
    if (!formData.username || !formData.email || !formData.password) {
      errors.push("All fields are required!");
    }
    if (formData.password !== formData.confirmPassword) {
      errors.push("Passwords do not match!");
    }
    if (errors.length) {
      setErrorMessages(errors);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/users/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
        credentials: "include",
      });
      const data = await safeJson(res);
      console.log("SIGNUP RAW:", data);

      if (res.ok) {
        setSuccessMessage("Sign-up successful! Redirecting...");
        const userWithTime = { ...data, loginTime: Date.now() };
        localStorage.setItem("user-verse", JSON.stringify(userWithTime));
        localStorage.setItem("lastLogin", Date.now().toString());
        setUser(userWithTime);
        setTimeout(() => navigate(`/profile/${data._id}`), 2000);
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
