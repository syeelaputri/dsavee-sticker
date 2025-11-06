import React from "react";
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

  const total = (items || []).reduce((s, i) => {
    const price = Number(i.price) || 0;
    const qty = Number(i.qty) || 1;
    return s + price * qty;
  }, 0);

  // increase qty by 1
  const increaseQty = (item) => {
    const newQty = (Number(item.qty) || 1) + 1;
    updateItemQty({
      _cid: item._cid,
      id: item.id,
      variant: item.variant,
      qty: newQty,
    });
  };

  // decrease qty by 1 (min 1)
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

  // remove item (pass object to removeFromCart)
  const removeItem = (item) => {
    removeFromCart({ _cid: item._cid, id: item.id, variant: item.variant });
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
                        <div className="btn-group btn-group-sm me-3">
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => decreaseQty(i)}
                            disabled={(Number(i.qty) || 1) <= 1}
                          >
                            -
                          </button>
                          <span className="btn btn-outline-light text-dark px-3">
                            {Number(i.qty) || 1}
                          </span>
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => increaseQty(i)}
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
