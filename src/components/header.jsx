// src/components/header.jsx
import React from "react";
import { Link } from "react-router-dom";
import OffcanvasCart from "./offCanvasCart";

export default function Header() {
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

            {/* Tengah (kosong / bisa isi search bar nanti) */}
            <div className="col-sm-6 offset-sm-2 offset-md-0 col-lg-5 d-none d-lg-block"></div>

            {/* Bagian kanan */}
            <div className="col-sm-8 col-lg-4 d-flex justify-content-end gap-3 align-items-center mt-4 mt-sm-0 justify-content-center justify-content-sm-end">
              <ul className="d-flex justify-content-end list-unstyled m-0">
                {/* Profile */}
                <li>
                  <Link
                    to="/profile"
                    className="rounded-circle bg-light p-2 mx-1"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24">
                      <use xlinkHref="#user"></use>
                    </svg>
                  </Link>
                </li>

                {/* Cart (mobile) */}
                <li className="d-lg-none">
                  <a
                    href="#"
                    className="rounded-circle bg-light p-2 mx-1"
                    data-bs-toggle="offcanvas"
                    data-bs-target="#offcanvasCart"
                    aria-controls="offcanvasCart"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24">
                      <use xlinkHref="#cart"></use>
                    </svg>
                  </a>
                </li>
              </ul>

              {/* Cart (desktop) */}
              <div className="cart text-end d-none d-lg-block dropdown">
                <button
                  className="border-0 bg-transparent d-flex flex-column gap-2 lh-1"
                  type="button"
                  data-bs-toggle="offcanvas"
                  data-bs-target="#offcanvasCart"
                  aria-controls="offcanvasCart"
                >
                  <span className="fs-6 text-muted dropdown-toggle">
                    Your Cart
                  </span>
                </button>
              </div>

              {/* Tombol Login Admin menjadi Link ke /dashboardAdmin */}
            </div>
          </div>
        </div>
      </header>

      {/* Offcanvas components */}
      <OffcanvasCart />
    </>
  );
}
