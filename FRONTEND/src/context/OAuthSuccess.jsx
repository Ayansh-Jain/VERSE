import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
const idOf = (u) => {
    if (typeof u === "string") return u;
    if (u?._id) return u._id;
    return u.toString();
  };
const OAuthSuccess = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const finalizeOAuth = async () => {
      const token = localStorage.getItem("verse_token");
      if (token) {
        try {
          const me = await api.getCurrentUser();
          const normalized = {
            ...me,
            token,
            following: (me.following || []).map(idOf),
            followers: (me.followers || []).map(idOf),
          };
          localStorage.setItem("verse_user", JSON.stringify(normalized));
          setUser(normalized);
          navigate(`/profile/${me._id}`);
        } catch (err) {
          console.error("OAuth login failed:", err);
          localStorage.removeItem("verse_token");
          localStorage.removeItem("verse_user");
          navigate("/signin");
        }
      } else {
        navigate("/signin");
      }
    };
  
    finalizeOAuth();
  }, [navigate, setUser]); // ✅ Include dependencies here
  

  return <p>Signing you in...</p>;
};

export default OAuthSuccess;
