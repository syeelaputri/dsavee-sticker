import React, { useState } from "react";
import QuantityPicker from "./quantityPicker";
import { useCartDispatch } from "../contexts/index";

export default function ProductCard({ product }) {
  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(
    (product && product.variants && product.variants[0]) ||
      product?.color ||
      null
  );
  const dispatch = useCartDispatch();

  if (!product) {
    return (
      <div className="product-item">
        <div className="placeholder">No product</div>
      </div>
    );
  }

  function addToCart() {
    dispatch({
      type: "ADD_ITEM",
      payload: {
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        qty: Number(qty) || 1,
        size: product.size,
        image: product.image,
        variant: selectedVariant,
      },
    });
  }

  const rawPrice = product.price;
  const priceNum =
    typeof rawPrice === "number" ? rawPrice : parseFloat(rawPrice);
  const safePrice = Number.isFinite(priceNum) ? priceNum : 0;

  function getButtonPropsFromColor(color) {
    if (!color) return { className: "btn btn-primary btn-sm" };
    const bsVariants = [
      "primary",
      "secondary",
      "success",
      "danger",
      "warning",
      "info",
      "light",
      "dark",
    ];
    if (bsVariants.includes(color)) {
      return { className: `btn btn-${color} btn-sm` };
    }
    return {
      className: "btn btn-sm",
      style: { backgroundColor: color, color: getContrastColor(color) },
    };
  }

  function getContrastColor(bg) {
    try {
      if (bg.startsWith("#") && (bg.length === 7 || bg.length === 4)) {
        let r, g, b;
        if (bg.length === 7) {
          r = parseInt(bg.slice(1, 3), 16);
          g = parseInt(bg.slice(3, 5), 16);
          b = parseInt(bg.slice(5, 7), 16);
        } else {
          r = parseInt(bg[1] + bg[1], 16);
          g = parseInt(bg[2] + bg[2], 16);
          b = parseInt(bg[3] + bg[3], 16);
        }
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.6 ? "#111" : "#fff";
      }
      return "#fff";
    } catch (e) {
      return "#fff";
    }
  }

  const btnProps = getButtonPropsFromColor(selectedVariant);

  return (
    <div className="product-item card p-3 product-card position-relative">
      {product.badge && (
        <span
          className={`badge position-absolute badge-custom`}
          style={
            product.badgeColor ? { backgroundColor: product.badgeColor } : {}
          }
        >
          {product.badge}
        </span>
      )}

      <figure className="text-center mb-0">
        <img
          src={product.image || "/images/placeholder.png"}
          alt={product.name || "Produk"}
          className="img-fluid"
          style={{ maxHeight: 140 }}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/images/placeholder.png";
          }}
        />
      </figure>

      <h3 className="h6 mt-2 mb-1">{product.name}</h3>
      <div className="meta text-muted mb-2">
        <small>{product.size || ""}</small>
      </div>

      {product.variants && product.variants.length > 0 && (
        <div className="d-flex align-items-center mb-2 variant-row">
          <small className="me-2 text-muted">Varian:</small>
          <div className="d-flex align-items-center">
            {product.variants.map((v, i) => (
              <button
                key={i}
                type="button"
                className={`variant-swatch btn p-0 me-1 ${
                  selectedVariant === v ? "selected" : ""
                }`}
                onClick={() => setSelectedVariant(v)}
                aria-label={`Pilih varian ${v}`}
                title={v}
                style={{ backgroundColor: v }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="price my-2">
        <strong>Rp{safePrice.toFixed(2)}</strong>
      </div>

      <div className="d-flex align-items-center justify-content-between">
        <QuantityPicker qty={qty} onChange={setQty} />

        <button
          {...(btnProps.style ? { style: btnProps.style } : {})}
          className={btnProps.className + " add-to-cart-btn"}
          onClick={addToCart}
        >
          Add to Cart <i className="uil uil-shopping-cart ms-1"></i>
        </button>
      </div>
    </div>
  );
}
