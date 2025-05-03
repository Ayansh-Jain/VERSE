// src/components/Navbar.jsx
import "../styles/Navbar.css";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/signin");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="NavbarContainer">
      <nav className="navbar">
        <div className="logo">Verse</div>
        <div className="nav-buttons">
          {user ? (
            <>
              <Link to={`/feed/${user._id}`} className="navButtons">  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256"
    width="48"
    height="48"
    fill="#ffffff"
    className="nav-svg"
  >
    <g transform="scale(5.33333)">
      <path d="M23.95117,4c-0.31984,0.01092 -0.62781,0.12384 -0.87891,0.32227l-14.21289,11.19727c-1.8039,1.42163 -2.85937,3.59398 -2.85937,5.89063v19.08984c0,1.36359 1.13641,2.5 2.5,2.5h10c1.36359,0 2.5,-1.13641 2.5,-2.5v-10c0,-0.29504 0.20496,-0.5 0.5,-0.5h5c0.29504,0 0.5,0.20496 0.5,0.5v10c0,1.36359 1.13641,2.5 2.5,2.5h10c1.36359,0 2.5,-1.13641 2.5,-2.5v-19.08984c0,-2.29665 -1.05548,-4.46899 -2.85937,-5.89062l-14.21289,-11.19727c-0.27738,-0.21912 -0.62324,-0.33326 -0.97656,-0.32227zM24,7.41016l13.28516,10.4668c1.0841,0.85437 1.71484,2.15385 1.71484,3.5332v18.58984h-9v-9.5c0,-1.91495 -1.58505,-3.5 -3.5,-3.5h-5c-1.91495,0 -3.5,1.58505 -3.5,3.5v9.5h-9v-18.58984c0,-1.37935 0.63074,-2.67883 1.71484,-3.5332z" />
    </g>
  </svg><span className="nav-span">Feed</span></Link>
              <Link to={`/polls/${user._id}`} className="navButtons">Polls</Link>
              <Link to={`/message/${user._id}`} className="navButtons">Messages</Link>
              <Link to={`/profile/${user._id}`} className="navButtons">Profile</Link>
            </>
          ) : (
            <>
              <Link to="/signin" className="navButtons">Sign In</Link>
              <Link to="/signup" className="navButtons">Sign Up</Link>
            </>
          )}
        </div>
        {user && (
          <span className="navButtons" id="navLogout" onClick={handleLogout}>
            Logout
          </span>
        )}
      </nav>
    </div>
  );
};

export default Navbar;

