// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { api } from "../api";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // on first mount, fetch the real current user
    api.getCurrentUser()
      .then((me) => {
        // `me.following` was populated as [{_id,username,...},…]
        const normalized = {
          ...me,
          following: (me.following || []).map((u) => u._id),
          followers: (me.followers || []).map((u) => u._id),
        };
        setUser(normalized);
        localStorage.setItem("user-verse", JSON.stringify(normalized));
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem("user-verse");
      })
      .finally(() => setLoading(false));
  }, []);  // ← empty deps!

  const logout = async () => {
    // 1) clear cookie on server
    try {
      await api.logout();  // POST /api/users/logout
    } catch (err) {
      console.error("Error during server logout:", err);
    }
    // 2) then clear client
    localStorage.removeItem("user-verse");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
