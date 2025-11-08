import React, { useState, useEffect } from "react";

export default function QuantityPicker({ qty = 1, onChange }) {
  const [value, setValue] = useState(qty);

  useEffect(() => {
    setValue(qty);
  }, [qty]);

  const dec = () => {
    const newQty = Math.max(1, value - 1);
    setValue(newQty);
    onChange(newQty);
  };

  const inc = () => {
    const newQty = value + 1;
    setValue(newQty);
    onChange(newQty);
  };

  const handleChange = (e) => {
    // Izinkan user mengetik angka langsung
    const input = e.target.value.replace(/[^\d]/g, ""); // hanya angka
    setValue(input);
  };

  const handleBlur = () => {
    // Saat user selesai mengetik
    const num = parseInt(value, 10);
    const newQty = !isNaN(num) && num > 0 ? num : 1;
    setValue(newQty);
    onChange(newQty);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleBlur();
    }
  };

  return (
    <div className="input-group product-qty" style={{ width: "fit-content" }}>
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
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          width: "60px",
          textAlign: "center",
          fontWeight: "500",
          fontSize: "16px",
        }}
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
