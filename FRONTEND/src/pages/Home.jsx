//src/pages/Home.jsx
import { Link } from "react-router-dom";
import "../styles/Home.css";

const Home = () => {
  return (
    <div className="home-container">
      <header className="hero-section fade-in">
        <h1 className="hero-title">Welcome to Verse</h1>
        <p className="hero-description">
          Discover, share, and challenge yourself with amazing content! Verse connects you with friends, emerging talents, and top creators.
        </p>
        <Link to="/signup">
          <button className="cta-button fade-in delay-1">Get Started - Sign Up</button>
        </Link>
      </header>
      <section className="features-section fade-in delay-2">
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Challenge Your Skills</h3>
            <p>Engage in fun challenges and compete with like-minded creators.</p>
          </div>
          <div className="feature-card">
            <h3>Follow & Connect</h3>
            <p>Follow your favorite creators and view a curated feed of top content.</p>
          </div>
          <div className="feature-card">
            <h3>Quality Content</h3>
            <p>
              See posts from your network and discover random top accounts with high verse points.
            </p>
          </div>
        </div>
      </section>
      <section className="about-section fade-in delay-3">
        <h2>About Verse</h2>
        <p>
          Verse is your ultimate creative platform—where art, talent, and challenges come together.
          Whether you are a creator or an admirer, join us and be part of an inspiring community.
        </p>
      </section>
      <footer className="footer fade-in delay-4">
        <div className="footer-content">
          <p>&copy; {new Date().getFullYear()} Verse. All rights reserved.</p>
          <div className="footer-links">
            <Link to="/about">About</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
