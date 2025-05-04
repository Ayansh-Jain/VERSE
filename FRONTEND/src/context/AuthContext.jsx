// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { api } from "../api";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);
const idOf = (u) => {
  if (typeof u === "string") return u;
  if (u?._id) return u._id;
  return u.toString();
};
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);    // will include token and normalized ids
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem("verse_token");
    if (token) {
      api.getCurrentUser()
        .then((me) => {
          const normalized = {
            ...me,
            token,
            following: (me.following || []).map(idOf),
            followers: (me.followers || []).map(idOf),
          };
          setUser(normalized);
          localStorage.setItem("verse_user", JSON.stringify(normalized));
        })
        .catch((err) => {
          console.error("Error fetching current user:", err);
          localStorage.removeItem("verse_token");
          localStorage.removeItem("verse_user");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("verse_token");
    localStorage.removeItem("verse_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
