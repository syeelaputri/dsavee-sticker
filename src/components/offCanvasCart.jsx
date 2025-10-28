// src/components/OffcanvasCart.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useCartState, useCartDispatch } from "../contexts/index";

export default function OffcanvasCart() {
  const { items } = useCartState();
  const dispatch = useCartDispatch();
  const navigate = useNavigate();

  const total = (items || []).reduce((s, i) => {
    const price = Number(i.price) || 0;
    const qty = Number(i.qty) || 1;
    return s + price * qty;
  }, 0);

  // Fungsi tambah quantity
  const increaseQty = (itemId) => {
    const item = items.find((i) => i.id === itemId);
    dispatch({
      type: "UPDATE_QTY",
      payload: { id: itemId, qty: (item.qty || 1) + 1 },
    });
  };

  // Fungsi kurangi quantity
  const decreaseQty = (itemId) => {
    const item = items.find((i) => i.id === itemId);
    const currentQty = Number(item.qty) || 1;
    if (currentQty > 1) {
      dispatch({
        type: "UPDATE_QTY",
        payload: { id: itemId, qty: currentQty - 1 },
      });
    }
  };

  // Fungsi hapus item
  const removeItem = (itemId) => {
    dispatch({ type: "REMOVE_ITEM", payload: itemId });
  };

  const handleContinue = (e) => {
    try {
      const el = document.getElementById("offcanvasCart");
      const bs = (window.bootstrap && window.bootstrap.Offcanvas) || null;
      if (bs && el) {
        const inst = bs.getInstance(el) || new bs(el);
        inst.hide();
      }
    } catch (err) {
      console.warn("Gagal menutup offcanvas via Bootstrap API:", err);
    }

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
                <div className="flex-grow-1">
                  {/* ROW UNTUK GAMBAR & INFO PRODUK */}
                  <div className="row align-items-center">
                    {/* GAMBAR PRODUK */}
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

                    {/* INFO PRODUK */}
                    <div className="col-9">
                      <h6 className="my-0">{i.name}</h6>
                      <small className="text-body-secondary">
                        {i.size || ""}
                      </small>

                      {/* TOMBOL QUANTITY CONTROL */}
                      <div className="mt-2 d-flex align-items-center">
                        <div className="btn-group btn-group-sm me-3">
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => decreaseQty(i.id)}
                            disabled={(Number(i.qty) || 1) <= 1}
                          >
                            -
                          </button>
                          <span className="btn btn-outline-light text-dark px-3">
                            {Number(i.qty) || 1}
                          </span>
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => increaseQty(i.id)}
                          >
                            +
                          </button>
                        </div>

                        {/* TOMBOL HAPUS */}
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => removeItem(i.id)}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SUBTOTAL */}
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
              <span>Total (Rp)</span>
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
