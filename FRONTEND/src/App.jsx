// src/App.jsx
import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Profile from "./pages/Profile";
import Feed from "./pages/Feed";
import Polls from "./pages/Polls";
import Message from "./pages/Message";
import AuthLayout from "./components/AuthLayout";
import Layout from "./components/Layout";
import { useAuth } from "./context/AuthContext";
import OAuthSuccess from "./pages/OAuthSuccess";

function App() {
  const { user, loading } = useAuth();

  // ⚙️ Setup dynamic vh CSS variable
  useEffect(() => {
    const setVh = () => {
      // 1% of the viewport height
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Initial set and on every resize
    setVh();
    window.addEventListener('resize', setVh);

    return () => window.removeEventListener('resize', setVh);
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <Routes>
      {/* Landing: Home or redirect to profile */}
      <Route
        path="/"
        element={!user ? <Home /> : <Navigate to={`/profile/${user._id}`} replace />}
      />

      {/* Auth Pages */}
      <Route element={<AuthLayout />}>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/oauth/success" element={<OAuthSuccess />} />
      </Route>

      {/* App Layout & Protected Pages */}
      <Route element={<Layout />}>
        <Route
          path="/profile/:userId"
          element={user ? <Profile /> : <Navigate to="/signin" replace />}
        />
        <Route
          path="/feed/:userId"
          element={user ? <Feed /> : <Navigate to="/signin" replace />}
        />
        <Route
          path="/polls/:userId"
          element={user ? <Polls /> : <Navigate to="/signin" replace />}
        />
        <Route
          path="/message/:userId"
          element={user ? <Message /> : <Navigate to="/signin" replace />}
        />
      </Route>
    </Routes>
  );
}

export default App;
