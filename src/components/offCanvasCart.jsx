// src/components/offCanvasCart.jsx
import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";

export default function OffcanvasCart() {
  const {
    cart: items = [],
    updateItemQty,
    removeFromCart,
    addToCart,
    getCartTotal,
  } = useCart();
  const navigate = useNavigate();

  const offcanvasRef = useRef(null);
  const offcanvasInstanceRef = useRef(null);

  const total = (items || []).reduce((s, i) => {
    const price = Number(i.price) || 0;
    const qty = Number(i.qty) || 1;
    return s + price * qty;
  }, 0);

  // increase qty
  const increaseQty = (item) => {
    const newQty = (Number(item.qty) || 1) + 1;
    updateItemQty({
      _cid: item._cid,
      id: item.id,
      variant: item.variant,
      qty: newQty,
    });
  };

  // decrease qty
  const decreaseQty = (item) => {
    const currentQty = Number(item.qty) || 1;
    if (currentQty > 1) {
      const newQty = currentQty - 1;
      updateItemQty({
        _cid: item._cid,
        id: item.id,
        variant: item.variant,
        qty: newQty,
      });
    }
  };

  const removeItem = (item) => {
    removeFromCart({ _cid: item._cid, id: item.id, variant: item.variant });
  };

  // Initialize Bootstrap Offcanvas instance (if available) and perform tidy-up on unmount
  useEffect(() => {
    const el = offcanvasRef.current;
    const Offcanvas = window.bootstrap && window.bootstrap.Offcanvas;

    if (el && Offcanvas) {
      try {
        offcanvasInstanceRef.current =
          Offcanvas.getInstance && Offcanvas.getInstance(el)
            ? Offcanvas.getInstance(el)
            : new Offcanvas(el);
      } catch (err) {
        console.warn("Gagal inisialisasi Offcanvas API:", err);
        offcanvasInstanceRef.current = null;
      }
    }

    // Cleanup function - important to remove inline styles/backdrops that break re-open
    return () => {
      try {
        if (
          offcanvasInstanceRef.current &&
          offcanvasInstanceRef.current.dispose
        ) {
          offcanvasInstanceRef.current.dispose();
        }
      } catch (err) {
        // ignore
      }

      if (el) {
        el.classList.remove("show");
        el.removeAttribute("style");
        el.setAttribute("aria-hidden", "true");
      }

      document.body.classList.remove("offcanvas-open", "modal-open");
      document
        .querySelectorAll(".offcanvas-backdrop, .modal-backdrop")
        .forEach((b) => b.remove());

      offcanvasInstanceRef.current = null;
    };
  }, []);

  // Close offcanvas then navigate to checkout. If Bootstrp API present, rely on it and wait for 'hidden' event.
  const handleContinue = (e) => {
    const el = offcanvasRef.current;
    const inst = offcanvasInstanceRef.current;

    try {
      if (inst && typeof inst.hide === "function") {
        // Wait for bootstrap's hidden event to navigate so offcanvas can fully reset
        const onHidden = () => {
          navigate("/checkout");
        };
        el.addEventListener("hidden.bs.offcanvas", onHidden, { once: true });
        inst.hide();
      } else if (el) {
        // Fallback if Bootstrap JS isn't available for some reason
        // Remove show class and any inline styles that would prevent future opens
        el.classList.remove("show");
        el.removeAttribute("style");
        el.setAttribute("aria-hidden", "true");

        // Remove leftover backdrops and body classes
        document.body.classList.remove("offcanvas-open", "modal-open");
        document
          .querySelectorAll(".offcanvas-backdrop, .modal-backdrop")
          .forEach((b) => b.remove());

        // Short delay so UI updates, then navigate
        setTimeout(() => navigate("/checkout"), 50);
      } else {
        navigate("/checkout");
      }
    } catch (err) {
      console.warn("Gagal menutup offcanvas atau navigasi:", err);
      navigate("/checkout");
    }
  };

  return (
    <div
      ref={offcanvasRef}
      className="offcanvas offcanvas-end"
      data-bs-scroll="true"
      tabIndex="-1"
      id="offcanvasCart"
      aria-labelledby="My Cart"
    >
      {/* CUSTOM CSS: memastikan garis-garis pada tombol qty terlihat utuh */}
      <style>{`
        /* Pastikan offcanvas tidak memotong border tombol */
        #offcanvasCart .offcanvas-body {
          overflow: visible;
        }

        /* Grup qty khusus agar garis tegas dan tidak putus */
        .cart-qty-btn-group .btn {
          border-width: 1px !important;
          border-color: #dee2e6 !important;
          box-shadow: none !important;
          position: relative;
          z-index: 1;
        }

        /* Hilangkan radius yang menyebabkan border 'terpotong' pada tengah */
        .cart-qty-btn-group .btn:first-child {
          border-top-right-radius: 0 !important;
          border-bottom-right-radius: 0 !important;
        }
        .cart-qty-btn-group .qty-display {
          border-radius: 0 !important;
          border-left: 0 !important;
          border-right: 0 !important;
          pointer-events: none;
        }
        .cart-qty-btn-group .btn:last-child {
          border-top-left-radius: 0 !important;
          border-bottom-left-radius: 0 !important;
        }

        /* Pastikan tengahnya terlihat seperti tombol (tetap ada padding) */
        .cart-qty-btn-group .qty-display {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
        }

        /* Agar garis pemisah antar tombol selalu tampak */
        .cart-qty-btn-group .btn + .btn {
          margin-left: 0 !important;
        }
      `}</style>

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
                key={i._cid ?? i.id ?? idx}
                className="list-group-item d-flex justify-content-between lh-sm"
              >
                <div className="flex-grow-1">
                  <div className="row align-items-center">
                    <div className="col-3">
                      <img
                        src={i.image || "/placeholder-image.jpg"}
                        alt={i.name}
                        className="img-fluid rounded"
                        style={{
                          width: "50px",
                          height: "50px",
                          objectFit: "cover",
                          border: "1px solid #dee2e6",
                        }}
                        onError={(e) => {
                          e.target.src = "/placeholder-image.jpg";
                        }}
                      />
                    </div>

                    <div className="col-9">
                      <h6 className="my-0">{i.name}</h6>
                      <small className="text-body-secondary">
                        {i.size || ""}
                      </small>

                      <div className="mt-2 d-flex align-items-center">
                        {/* gunakan class cart-qty-btn-group untuk custom styling */}
                        <div
                          className="btn-group btn-group-sm me-3 cart-qty-btn-group"
                          role="group"
                          aria-label="Quantity controls"
                        >
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => decreaseQty(i)}
                            disabled={(Number(i.qty) || 1) <= 1}
                            aria-label={`Kurangi jumlah ${i.name}`}
                          >
                            -
                          </button>

                          {/* Tampilkan qty dengan border yang sama agar tidak 'terpotong' */}
                          <span
                            className="btn btn-outline-secondary text-dark px-3 qty-display"
                            aria-hidden="true"
                          >
                            {Number(i.qty) || 1}
                          </span>

                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => increaseQty(i)}
                            aria-label={`Tambah jumlah ${i.name}`}
                          >
                            +
                          </button>
                        </div>

                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => removeItem(i)}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-end ms-2">
                  <span className="text-body-secondary d-block">
                    Rp
                    {((Number(i.price) || 0) * (Number(i.qty) || 1)).toFixed(2)}
                  </span>
                  <small className="text-muted">
                    Rp{(Number(i.price) || 0).toFixed(2)} × {Number(i.qty) || 1}
                  </small>
                </div>
              </li>
            ))}

            <li className="list-group-item d-flex justify-content-between">
              <span>Total</span>
              <strong>Rp{total.toFixed(2)}</strong>
            </li>
          </ul>

          <button
            type="button"
            className="w-100 btn btn-primary btn-lg"
            onClick={handleContinue}
            disabled={items.length === 0}
          >
            Continue to checkout
          </button>
        </div>
      </div>
    </div>
  );
}
