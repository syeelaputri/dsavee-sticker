import React, { useState } from "react";
import QuantityPicker from "./quantityPicker";
import { useCartDispatch } from "../contexts/index";

export default function ProductCard({ product }) {
  const [qty, setQty] = useState(1);
  const dispatch = useCartDispatch();

  function addToCart() {
    dispatch({
      type: "ADD_ITEM",
      payload: {
        id: product.id,
        name: product.name,
        price: product.price,
        qty,
        size: product.size,
        image: product.image,
      },
    });
  }

  return (
    <div className="product-item">
      {product.badge && (
        <span className="badge bg-success position-absolute m-3">
          {product.badge}
        </span>
      )}
      <a href="#" className="btn-wishlist">
        <svg width="24" height="24">
          <use xlinkHref="#heart"></use>
        </svg>
      </a>
      <figure>
        <a href="#" title={product.name}>
          <img src={product.image} className="tab-image" alt={product.name} />
        </a>
      </figure>
      <h3>{product.name}</h3>
      <span className="qty">{product.qtyLabel || "1 Unit"}</span>
      <span className="rating">
        <svg width="24" height="24" className="text-primary">
          <use xlinkHref="#star-solid"></use>
        </svg>{" "}
        {product.rating || "4.5"}
      </span>
      <span className="price">${product.price.toFixed(2)}</span>

      <div className="d-flex align-items-center justify-content-between">
        <QuantityPicker qty={qty} onChange={setQty} />
        <button className="nav-link btn btn-link" onClick={addToCart}>
          Add to Cart <i className="uil uil-shopping-cart"></i>
        </button>
      </div>
    </div>
  );
}
