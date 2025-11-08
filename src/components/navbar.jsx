import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AboutUs } from "../pages/aboutUs";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Styles
  const styles = {
    navbar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "1rem 2rem",
      backgroundColor: "#fff",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      position: "sticky",
      top: 0,
      zIndex: 1000,
    },
    navBrand: {
      fontSize: "1.5rem",
      fontWeight: "bold",
    },
    brandLink: {
      color: "#333",
      textDecoration: "none",
    },
    desktopMenu: {
      display: "flex",
      gap: "2rem",
    },
    navLink: {
      textDecoration: "none",
      color: "#333",
      transition: "color 0.3s",
      fontWeight: "500",
    },
    hamburgerBtn: {
      display: "none",
      background: "none",
      border: "none",
      fontSize: "1.5rem",
      cursor: "pointer",
      padding: "0.5rem",
    },
    mobileMenuOverlay: {
      display: "none",
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.5)",
      zIndex: 999,
      opacity: 0,
      transition: "opacity 0.3s ease",
    },
    mobileMenuOverlayActive: {
      display: "block",
      opacity: 1,
    },
    mobileMenu: {
      position: "fixed",
      top: 0,
      right: "-100%",
      width: "80%",
      maxWidth: "300px",
      height: "100%",
      background: "white",
      zIndex: 1000,
      transition: "right 0.3s ease",
      padding: "2rem 1rem",
      boxShadow: "-2px 0 10px rgba(0,0,0,0.1)",
    },
    mobileMenuActive: {
      right: 0,
    },
    closeBtn: {
      position: "absolute",
      top: "1rem",
      right: "1rem",
      background: "none",
      border: "none",
      fontSize: "2rem",
      cursor: "pointer",
      color: "#333",
    },
    mobileMenuContent: {
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
      marginTop: "3rem",
    },
    mobileNavLink: {
      textDecoration: "none",
      color: "#333",
      padding: "1rem",
      fontSize: "1.1rem",
      borderBottom: "1px solid #eee",
      transition: "background-color 0.3s",
    },
  };

  // Media query styles untuk responsive
  const mediaQueryStyles = `
    @media (max-width: 768px) {
      .desktop-menu {
        display: none !important;
      }
      
      .hamburger-btn {
        display: block !important;
      }
      
      .nav-brand .brand-link {
        font-size: 1.2rem !important;
      }
    }
    
    @media (max-width: 480px) {
      .navbar {
        padding: 0.8rem !important;
      }
      
      .nav-brand .brand-link {
        font-size: 1.1rem !important;
      }
    }
  `;

  // Hover effects
  const handleMouseEnter = (e) => {
    if (
      e.target.className.includes("nav-link") ||
      e.target.className.includes("mobile-nav-link")
    ) {
      e.target.style.color = "#007bff";
    }
  };

  const handleMouseLeave = (e) => {
    if (
      e.target.className.includes("nav-link") ||
      e.target.className.includes("mobile-nav-link")
    ) {
      e.target.style.color = "#333";
    }
  };

  return (
    <>
      {/* Inject CSS media queries */}
      <style>{mediaQueryStyles}</style>

      <nav style={styles.navbar}>
        {/* Brand Logo */}
        <div className="nav-brand">
          <Link to="/" style={styles.brandLink} className="brand-link">
            Ekspresikan Dirimu!
          </Link>
        </div>

        {/* Desktop Menu */}
        <div className="desktop-menu" style={styles.desktopMenu}>
          <Link
            to="/"
            style={styles.navLink}
            className="nav-link"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Home
          </Link>
          <Link
            to="/aboutUs"
            style={styles.navLink}
            className="nav-link"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            About Us
          </Link>
        </div>

        {/* Mobile Hamburger Menu */}
        <button
          style={styles.hamburgerBtn}
          className="hamburger-btn"
          onClick={toggleMenu}
        >
          ☰
        </button>

        {/* Mobile Menu Overlay */}
        <div
          style={
            isMenuOpen
              ? {
                  ...styles.mobileMenuOverlay,
                  ...styles.mobileMenuOverlayActive,
                }
              : styles.mobileMenuOverlay
          }
          className={`mobile-menu-overlay ${isMenuOpen ? "active" : ""}`}
          onClick={toggleMenu}
        ></div>

        {/* Mobile Menu */}
        <div
          style={
            isMenuOpen
              ? { ...styles.mobileMenu, ...styles.mobileMenuActive }
              : styles.mobileMenu
          }
          className={`mobile-menu ${isMenuOpen ? "active" : ""}`}
        >
          <button style={styles.closeBtn} onClick={toggleMenu}>
            ×
          </button>

          <div style={styles.mobileMenuContent}>
            <Link
              to="/"
              style={styles.mobileNavLink}
              className="mobile-nav-link"
              onClick={() => {
                toggleMenu();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              Home
            </Link>
            <Link
              to="/aboutUs"
              style={styles.mobileNavLink}
              className="mobile-nav-link"
              onClick={toggleMenu}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              About Us
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
