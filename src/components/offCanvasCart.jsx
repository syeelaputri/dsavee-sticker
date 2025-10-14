import React from "react";
import { useCartState, useCartDispatch } from "../contexts/index";

export default function OffcanvasCart() {
  const { items } = useCartState();
  const dispatch = useCartDispatch();

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

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
            {items.map((i) => (
              <li
                key={i.id}
                className="list-group-item d-flex justify-content-between lh-sm"
              >
                <div>
                  <h6 className="my-0">{i.name}</h6>
                  <small className="text-body-secondary">
                    {i.size || ""} • {i.qty} unit
                  </small>
                </div>
                <span className="text-body-secondary">
                  ${(i.price * i.qty).toFixed(2)}
                </span>
              </li>
            ))}

            <li className="list-group-item d-flex justify-content-between">
              <span>Total (USD)</span>
              <strong>${total.toFixed(2)}</strong>
            </li>
          </ul>

          <a href="/checkout" className="w-100 btn btn-primary btn-lg">
            Continue to checkout
          </a>
        </div>
      </div>
    </div>
  );
}
