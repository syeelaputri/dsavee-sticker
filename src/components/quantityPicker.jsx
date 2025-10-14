import React from "react";

export default function QuantityPicker({ qty = 1, onChange }) {
  const dec = () => onChange(Math.max(1, qty - 1));
  const inc = () => onChange(qty + 1);

  return (
    <div className="input-group product-qty">
      <span className="input-group-btn">
        <button
          type="button"
          className="quantity-left-minus btn btn-danger btn-number"
          data-type="minus"
          onClick={dec}
        >
          <svg width="16" height="16">
            <use xlinkHref="#minus" />
          </svg>
        </button>
      </span>
      <input
        type="text"
        className="form-control input-number"
        value={qty}
        readOnly
      />
      <span className="input-group-btn">
        <button
          type="button"
          className="quantity-right-plus btn btn-success btn-number"
          data-type="plus"
          onClick={inc}
        >
          <svg width="16" height="16">
            <use xlinkHref="#plus" />
          </svg>
        </button>
      </span>
    </div>
  );
}
