import React from "react";
import { useCartState, useCartDispatch } from "../contexts/index";

export default function CartPage() {
  const { items } = useCartState();
  const dispatch = useCartDispatch();
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="container my-5">
      <h2>Cart</h2>
      <ul className="list-group mb-3">
        {items.map((i) => (
          <li
            key={i.id}
            className="list-group-item d-flex justify-content-between lh-sm"
          >
            <div>
              <h6 className="my-0">{i.name}</h6>
              <small className="text-body-secondary">{i.size || ""}</small>
            </div>
            <div>
              <span className="text-body-secondary">
                Rp{(i.price * i.qty).toFixed(2)}
              </span>
            </div>
          </li>
        ))}
        <li className="list-group-item d-flex justify-content-between">
          <span>Total (Rp)</span>
          <strong>Rp{total.toFixed(2)}</strong>
        </li>
      </ul>

      <a href="/checkout" className="btn btn-primary btn-lg">
        Checkout
      </a>
    </div>
  );
}
