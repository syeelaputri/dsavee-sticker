// src/components/header.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import OffcanvasCart from "./offCanvasCart";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { FiShoppingCart } from "react-icons/fi";

/**
 * NOTE:
 * - Admin email hardcoded sesuai permintaan: dsaveesticker@gmail.com
 * - Jika Anda ingin memindahkan konfigurasi admin ke tempat lain,
 *   ganti pengecekan isAdmin dengan import dari config/shared constant.
 */
const ADMIN_EMAIL = "dsaveesticker@gmail.com";

export default function Header() {
  const { user, logout } = useAuth();
  const { getCartItemsCount } = useCart();
  const cartCount =
    typeof getCartItemsCount === "function" ? getCartItemsCount() : 0;

  const [showConfirm, setShowConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Determine admin by email (case-insensitive)
  const isAdmin =
    !!user &&
    !!user.email &&
    user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // Manage body class & cleanup when modal shown/hidden
  useEffect(() => {
    if (showConfirm) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }

    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [showConfirm]);

  const openConfirm = (e) => {
    e?.preventDefault?.();
    setShowConfirm(true);
  };

  const closeConfirm = (e) => {
    e?.preventDefault?.();
    setShowConfirm(false);
  };

  const handleConfirmLogout = async (e) => {
    e?.preventDefault?.();
    try {
      setLoggingOut(true);
      await logout();

      const pathname = (location && location.pathname) || "";
      const normalized = pathname.toLowerCase();

      const shouldRedirectToHome =
        normalized.startsWith("/checkout") ||
        normalized.startsWith("/order") ||
        normalized.startsWith("/orders") ||
        normalized.startsWith("/order-history") ||
        normalized.startsWith("/orderhistory") ||
        normalized === "/orderhistory" ||
        normalized === "/orderhistory/";

      if (shouldRedirectToHome) {
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoggingOut(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <header>
        <div className="container-fluid">
          <div className="row py-3 border-bottom">
            {/* Logo */}
            <div className="col-sm-4 col-lg-3 text-center text-sm-start">
              <div className="main-logo">
                <Link to="/">
                  <img
                    src="/images/logo.png"
                    alt="logo"
                    className="img-fluid"
                  />
                </Link>
              </div>
            </div>

            {/* Empty space / nav placeholder */}
            <div className="col-sm-6 offset-sm-2 offset-md-0 col-lg-5 d-none d-lg-block"></div>

            {/* User actions */}
            <div className="col-sm-8 col-lg-4 d-flex justify-content-end gap-3 align-items-center mt-4 mt-sm-0 justify-content-center justify-content-sm-end">
              <ul className="d-flex justify-content-end list-unstyled m-0 align-items-center">
                {/* Cart Button - HANYA untuk non-admin */}
                {!isAdmin && (
                  <li className="me-2">
                    <a
                      href="#"
                      className="rounded-circle bg-light p-2 mx-1 position-relative"
                      data-bs-toggle="offcanvas"
                      data-bs-target="#offcanvasCart"
                      aria-controls="offcanvasCart"
                      onClick={(e) => {
                        e.preventDefault();
                      }}
                    >
                      <FiShoppingCart size={24} />
                      {cartCount > 0 && (
                        <span
                          style={{
                            position: "absolute",
                            top: -6,
                            right: -6,
                            background: "#dc3545",
                            color: "#fff",
                            borderRadius: 999,
                            padding: "2px 6px",
                            fontSize: 12,
                          }}
                        >
                          {cartCount}
                        </span>
                      )}
                    </a>
                  </li>
                )}

                {/* User login / logout */}
                <li>
                  {user ? (
                    <div className="d-flex align-items-center gap-2">
                      {/* Jika admin: tampilkan profile sebagai teks non-link yang tidak bisa diklik */}
                      {isAdmin ? (
                        <div
                          className="text-decoration-none"
                          style={{
                            cursor: "default",
                            opacity: 0.85,
                            userSelect: "none",
                            display: "inline-block",
                          }}
                          title="Profil tidak tersedia untuk akun admin"
                        >
                          <strong>{user.displayName || user.email}</strong>
                          <div style={{ fontSize: 12, color: "#666" }}>
                            {user.email}
                          </div>
                        </div>
                      ) : (
                        <Link to="/profile" className="text-decoration-none">
                          <strong>{user.displayName || user.email}</strong>
                          <div style={{ fontSize: 12, color: "#666" }}>
                            {user.email}
                          </div>
                        </Link>
                      )}

                      {/* Logout triggers confirmation modal (tetap tersedia untuk admin dan non-admin) */}
                      <button
                        className="btn text-white fw-semibold"
                        onClick={openConfirm}
                        style={{
                          backgroundColor: "orange",
                          borderRadius: 8,
                          padding: "6px 12px",
                        }}
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <div className="d-flex gap-2">
                      <Link
                        to="/login"
                        className="btn btn-outline-primary px-3 py-2 fw-semibold"
                        style={{ borderRadius: 8 }}
                      >
                        Login
                      </Link>
                      <Link
                        to="/signup"
                        className="btn btn-primary px-3 py-2 fw-semibold"
                        style={{ borderRadius: 8 }}
                      >
                        Sign Up
                      </Link>
                    </div>
                  )}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </header>

      {/* Offcanvas Cart hanya render untuk non-admin */}
      {!isAdmin && <OffcanvasCart />}

      {/* Confirmation Modal */}
      {showConfirm && (
        <>
          <div className="modal-backdrop fade show"></div>

          <div
            className="modal fade show"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            style={{ display: "block" }}
          >
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Logout</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={closeConfirm}
                  ></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to logout?</p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeConfirm}
                    disabled={loggingOut}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleConfirmLogout}
                    disabled={loggingOut}
                  >
                    {loggingOut ? "Logging out..." : "Logout"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
