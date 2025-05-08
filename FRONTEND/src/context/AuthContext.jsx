// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { api } from "../api";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const idOf = (u) => {
  if (typeof u === "string") return u;
  if (u?._id)              return u._id;
  // fallback for anything else (including numbers, ObjectIds, etc.)
  return String(u);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("verse_token");
    if (!token) {
      setLoading(false);
      return;
    }

    api.getCurrentUser()
      .then((me) => {
        // remove any null/undefined before mapping
        const followingClean = Array.isArray(me.following)
          ? me.following.filter((x) => x != null).map(idOf)
          : [];

        const followersClean = Array.isArray(me.followers)
          ? me.followers.filter((x) => x != null).map(idOf)
          : [];

        const normalized = {
          ...me,
          token,
          following: followingClean,
          followers: followersClean,
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
