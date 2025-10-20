// src/components/OffcanvasCart.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useCartState } from "../contexts/index";

export default function OffcanvasCart() {
  const { items } = useCartState();
  const navigate = useNavigate();

  const total = (items || []).reduce((s, i) => {
    const price = Number(i.price) || 0;
    const qty = Number(i.qty) || 1;
    return s + price * qty;
  }, 0);

  const handleContinue = (e) => {
    // 1) tutup offcanvas via Bootstrap JS (jika tersedia)
    try {
      const el = document.getElementById("offcanvasCart");
      // `bootstrap` biasanya tersedia di window jika kamu memuat bundle Bootstrap JS
      const bs = (window.bootstrap && window.bootstrap.Offcanvas) || null;
      if (bs && el) {
        // ambil instance jika sudah ada, kalau belum buat lalu hide
        const inst = bs.getInstance(el) || new bs(el);
        inst.hide();
      }
    } catch (err) {
      // ignore — tetap navigasi
      console.warn("Gagal menutup offcanvas via Bootstrap API:", err);
    }

    // 2) lalu navigasi ke checkout (setelah hide dipanggil)
    // beri sedikit delay 100ms supaya animasi close mulai (opsional)
    setTimeout(() => navigate("/checkout"), 100);
  };

  return (
    <div
      className="offcanvas offcanvas-end"
      data-bs-scroll="true"
      tabIndex="-1"
      id="offcanvasCart"
      aria-labelledby="My Cart"
    >
      <div className="offcanvas-header justify-content-center">
        <button
          type="button"
          className="btn-close"
          data-bs-dismiss="offcanvas"
          aria-label="Close"
        ></button>
      </div>
      <div className="offcanvas-body">
        <div className="order-md-last">
          <h4 className="d-flex justify-content-between align-items-center mb-3">
            <span className="text-primary">Your cart</span>
            <span className="badge bg-primary rounded-pill">
              {items.length}
            </span>
          </h4>

          <ul className="list-group mb-3">
            {items.length === 0 && (
              <li className="list-group-item">Cart kosong</li>
            )}
            {items.map((i, idx) => (
              <li
                key={i.id ?? idx}
                className="list-group-item d-flex justify-content-between lh-sm"
              >
                <div>
                  <h6 className="my-0">{i.name}</h6>
                  <small className="text-body-secondary">{i.size || ""}</small>
                  <div className="text-muted">Qty: {Number(i.qty) || 1}</div>
                </div>
                <span className="text-body-secondary">
                  Rp{((Number(i.price) || 0) * (Number(i.qty) || 1)).toFixed(2)}
                </span>
              </li>
            ))}

            <li className="list-group-item d-flex justify-content-between">
              <span>Total (Rp)</span>
              <strong>Rp{total.toFixed(2)}</strong>
            </li>
          </ul>

          <button
            type="button"
            className="w-100 btn btn-primary btn-lg"
            onClick={handleContinue}
          >
            Continue to checkout
          </button>
        </div>
      </div>
    </div>
  );
}
