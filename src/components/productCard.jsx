// src/components/ProductCard.jsx
import React from "react";

export default function ProductCard({ product }) {
  // defensif: jika product undefined, render placeholder
  if (!product) {
    return (
      <div className="product-item">
        <div className="placeholder">No product</div>
      </div>
    );
  }

  // pastikan price adalah number
  const rawPrice = product.price;
  // jika Firebase menyimpan price sebagai "18" (string) -> parseFloat
  const priceNum =
    typeof rawPrice === "number" ? rawPrice : parseFloat(rawPrice);

  // jika bukan number setelah parse -> fallback 0
  const safePrice = Number.isFinite(priceNum) ? priceNum : 0;

  return (
    <div className="product-item card p-3">
      {product.badge && (
        <span className="badge bg-success position-absolute m-3">
          {product.badge}
        </span>
      )}
      <figure className="text-center">
        <img
          src={product.image}
          alt={product.name}
          className="img-fluid"
          style={{ maxHeight: 140 }}
        />
      </figure>

      <h3 className="h6 mt-2">{product.name || "Unnamed product"}</h3>
      <div className="meta text-muted">
        <small>{product.size || ""}</small>
      </div>

      <div className="price my-2">
        <strong>Rp{safePrice.toFixed(2)}</strong>
      </div>

      <div className="d-flex align-items-center justify-content-between">
        <div className="product-qty d-flex align-items-center">
          <button className="quantity-left-minus btn btn-sm btn-outline-secondary">
            −
          </button>
          <input
            className="quantity-input form-control form-control-sm mx-2 text-center"
            value={product.qty || 1}
            readOnly
            style={{ width: 48 }}
          />
          <button className="quantity-right-plus btn btn-sm btn-outline-secondary">
            ＋
          </button>
        </div>

        <button className="btn btn-link">Add to Cart</button>
      </div>
    </div>
  );
}
