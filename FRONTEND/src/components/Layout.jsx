// src/components/Layout.jsx
import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";
import "../styles/Layout.css";

const Layout = () => {
  return (
    <div className="Main-Layout">
      <Navbar />
      <section className="Main-section">
        <Outlet />
      </section>
    </div>
  );
};

export default Layout;
