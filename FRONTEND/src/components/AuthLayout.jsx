// src/components/AuthLayout.jsx
import { Outlet, Navigate } from "react-router-dom";
import "../styles/Auth.css";
import { useAuth } from "../context/AuthContext";

const AuthLayout = () => {
  const { user } = useAuth();

  return (
    <div className="SignUp">
      {user ? (
        // Redirect to the user's dynamic profile page
        <Navigate to={`/profile/${user._id}`} />
      ) : (
        <div className="SignUp-Container">
          <section className="signup-section">
            <Outlet />
          </section>
          <img
            src="/assets/Screenshot 2025-01-16 233921.png"
            className="SignUp-Img"
            alt="Signup Illustration"
          />
        </div>
      )}
    </div>
  );
};

export default AuthLayout;
