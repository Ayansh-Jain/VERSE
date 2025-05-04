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
              <Link to={`/polls/${user._id}`} className="navButtons"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none" className="nav-svg">
  <rect x="6" y="6" width="36" height="36" rx="4" stroke="white"/>
  <rect x="14" y="26" width="4" height="12" fill="white"/>
  <rect x="22" y="18" width="4" height="20" fill="white"/>
  <rect x="30" y="22" width="4" height="16" fill="white"/>
</svg>
<span className="nav-span">Polls</span></Link>
              <Link to={`/message/${user._id}`} className="navButtons"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF" className="nav-svg"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z"/></svg><span className="nav-span">Messages</span></Link>
              <Link to={`/profile/${user._id}`} className="navButtons"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF" className="nav-svg"><path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z"/></svg><span className="nav-span">Profile</span></Link>
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
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" className="nav-svg">
  <path d="M16 17L21 12L16 7" stroke="white" />
  <path d="M21 12H9" stroke="white" />
  <path d="M12 5H5C4.44772 5 4 5.44772 4 6V18C4 18.5523 4.44772 19 5 19H12" stroke="white" />
</svg>
<span className="nav-span">Logout</span>
          </span>
        )}
      </nav>
    </div>
  );
};

export default Navbar;

