import React from "react";
import { Link } from "react-router-dom";
import OffcanvasCart from "./offCanvasCart";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { FiShoppingCart } from "react-icons/fi";

export default function Header() {
  const { user, logout } = useAuth();
  const { getCartItemsCount } = useCart();
  const cartCount =
    typeof getCartItemsCount === "function" ? getCartItemsCount() : 0;

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
                {/* Cart Button */}
                <li className="me-2">
                  <a
                    href="#"
                    className="rounded-circle bg-light p-2 mx-1 position-relative"
                    data-bs-toggle="offcanvas"
                    data-bs-target="#offcanvasCart"
                    aria-controls="offcanvasCart"
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

                {/* User login / logout */}
                <li>
                  {user ? (
                    <div className="d-flex align-items-center gap-2">
                      <Link to="/profile" className="text-decoration-none">
                        <strong>{user.displayName || user.email}</strong>
                        <div style={{ fontSize: 12, color: "#666" }}>
                          {user.email}
                        </div>
                      </Link>
                      <button
                        className="btn text-white fw-semibold"
                        onClick={logout}
                        style={{
                          backgroundColor: "orange", // background tombol logout
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

      {/* Offcanvas Components */}
      <OffcanvasCart />
    </>
  );
}
