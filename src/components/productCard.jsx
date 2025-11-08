import React, { useState, useEffect, useRef } from "react";
import QuantityPicker from "./quantityPicker";
import { useCart } from "../contexts/CartContext"; // pastikan path sesuai
import { useNavigate } from "react-router-dom";

export default function ProductCard({ product }) {
  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(
    (product && product.variants && product.variants[0]) ||
      product?.color ||
      null
  );
  const { addToCart } = useCart(); // gunakan addToCart dari context
  const navigate = useNavigate();

  // --- image rotation state ---
  const [images, setImages] = useState([]); // collected from product.image, image1, image2...
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const intervalRef = useRef(null);

  // --- modal state for variant selection ---
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [modalSelectedIndex, setModalSelectedIndex] = useState(0);

  // Normalize product images into an array
  useEffect(() => {
    if (!product) {
      setImages([]);
      setCurrentImageIndex(0);
      return;
    }

    const imgs = [];
    // detect gambar image, image1, image2, ... up to image9 (sesuaikan jika butuh lebih)
    for (let i = 0; i < 10; i++) {
      const key = i === 0 ? "image" : `image${i}`;
      const url = product[key];
      if (url && typeof url === "string" && url.trim() !== "") {
        imgs.push(url);
      }
    }

    // fallback ke placeholder jika tidak ada gambar
    if (imgs.length === 0) {
      imgs.push(product.image || "/images/placeholder.png");
    }

    setImages(imgs);

    // try to set initial index based on selectedVariant index (if variants align with images)
    if (
      selectedVariant &&
      Array.isArray(product?.variants) &&
      product.variants.length > 0
    ) {
      const vIdx = product.variants.indexOf(selectedVariant);
      if (vIdx >= 0 && vIdx < imgs.length) {
        setCurrentImageIndex(vIdx);
      } else {
        setCurrentImageIndex(0);
      }
    } else {
      setCurrentImageIndex(0);
    }

    // cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  // when selectedVariant changes, try to show corresponding image (if index matches)
  useEffect(() => {
    if (!product) return;
    if (!images || images.length === 0) return;

    if (
      selectedVariant &&
      Array.isArray(product.variants) &&
      product.variants.length > 0
    ) {
      const vIdx = product.variants.indexOf(selectedVariant);
      if (vIdx >= 0 && vIdx < images.length) {
        setCurrentImageIndex(vIdx);
        return;
      }
    }
    // otherwise keep current or reset to 0
    setCurrentImageIndex((prev) => (prev < images.length ? prev : 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariant, images]);

  // start rotation on hover/focus
  const startRotation = () => {
    if (!images || images.length <= 1) return;
    if (intervalRef.current) return; // already running

    intervalRef.current = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 700); // rotate every 700ms
  };

  // stop rotation on mouseleave/blur and revert to selectedVariant image (or first)
  const stopRotation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // revert to variant-specific image if exists
    if (
      selectedVariant &&
      Array.isArray(product?.variants) &&
      product.variants.length > 0
    ) {
      const vIdx = product.variants.indexOf(selectedVariant);
      if (vIdx >= 0 && vIdx < images.length) {
        setCurrentImageIndex(vIdx);
        return;
      }
    }
    setCurrentImageIndex(0);
  };

  if (!product) {
    return (
      <div className="product-item">
        <div className="placeholder">No product</div>
      </div>
    );
  }

  function goToProductDetail() {
    if (product?.id) {
      navigate(`/product/${product.id}`);
    }
  }

  // helper to read stock field corresponding to image index:
  // index 0 -> "stock", index 1 -> "stock1", index 2 -> "stock2", etc.
  const getStockForIndex = (i) => {
    if (!product) return null;
    const key = i === 0 ? "stock" : `stock${i}`;
    const s = product[key];
    if (s === undefined || s === null) return null;
    // try parse to number
    const n = Number(s);
    return Number.isFinite(n) ? n : s;
  };

  // build variant labels (use product.variants if present)
  const getLabelForIndex = (i) => {
    if (Array.isArray(product?.variants) && product.variants[i]) {
      return product.variants[i];
    }
    // fallback: use keyword or Varian #
    if (product?.keyword && typeof product.keyword === "string" && i === 0) {
      // if there's a main keyword, show it for first variant
      return product.keyword;
    }
    return `Varian ${i + 1}`;
  };

  // Handler when user confirms modal selection
  const confirmVariantAndAddToCart = () => {
    const chosenIndex = modalSelectedIndex || 0;
    const chosenImage =
      images && images[chosenIndex] ? images[chosenIndex] : product.image;
    const chosenVariantLabel = getLabelForIndex(chosenIndex);
    addToCart({
      id: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      qty: Number(qty) || 1,
      size: product.size,
      image: chosenImage,
      variant: chosenVariantLabel,
      productId: product.id,
      variantIndex: chosenIndex, // optional metadata
    });

    // close modal
    setShowVariantModal(false);
    // feedback
    try {
      if (window?.toast)
        window.toast(
          `${product.name} (${chosenVariantLabel}) ditambahkan ke cart.`
        );
      else
        alert(
          `${product.name} (${chosenVariantLabel}) berhasil ditambahkan ke cart.`
        );
    } catch {}
  };

  // Add to cart button behavior: if product has multiple images/variants -> show modal,
  // otherwise add directly (preserve original behavior)
  const onAddToCartClick = (e) => {
    // decide if we should show modal: if more than 1 variant/image OR if there are stock1/stock2 fields
    const hasMultipleImages = images && images.length > 1;
    const hasStockVariants =
      product && (product.stock1 !== undefined || product.stock2 !== undefined);
    const hasVariantsArray =
      Array.isArray(product?.variants) && product.variants.length > 0;

    if (hasMultipleImages || hasStockVariants || hasVariantsArray) {
      // open modal for explicit selection
      setModalSelectedIndex(
        // try to set initial modal selection to current selectedVariant index
        Array.isArray(product?.variants) &&
          product.variants.indexOf(selectedVariant) >= 0
          ? product.variants.indexOf(selectedVariant)
          : 0
      );
      setShowVariantModal(true);
      return;
    }

    // fallback - single variant: add directly using current image
    addToCart({
      id: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      qty: Number(qty) || 1,
      size: product.size,
      image: images[currentImageIndex] || product.image,
      variant: selectedVariant,
      productId: product.id,
    });

    try {
      if (window?.toast)
        window.toast(`${product.name} berhasil ditambahkan ke cart.`);
      else alert(`${product.name} berhasil ditambahkan ke cart.`);
    } catch {}
  };

  const rawPrice = product.price;
  const priceNum =
    typeof rawPrice === "number" ? rawPrice : parseFloat(rawPrice);
  const safePrice = Number.isFinite(priceNum) ? priceNum : 0;

  // --- Badge: from Firebase (product.badge)
  const badgeText = product?.badge; // langsung dari database
  const badgeColorClass =
    product?.badgeColorClass || (!product?.badgeColor ? "bg-success" : "");
  const badgeInlineStyle = product?.badgeColor
    ? { backgroundColor: product.badgeColor }
    : undefined;
  // --- end badge

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
      if (
        typeof bg === "string" &&
        bg.startsWith("#") &&
        (bg.length === 7 || bg.length === 4)
      ) {
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

  // current image src (keamanan fallback)
  const currentSrc =
    images && images[currentImageIndex]
      ? images[currentImageIndex]
      : product.image || "/images/placeholder.png";

  return (
    <>
      <div
        className="product-item card p-3 product-card position-relative"
        style={{ position: "relative", zIndex: 1 }} // ensure card stacking context low (so navbar stays above)
      >
        {/* badge — tampil hanya jika product.badge ada */}
        {badgeText && (
          <span
            className={`badge ${badgeColorClass} position-absolute m-3`}
            style={{
              zIndex: 2, // lowered so navbar (zIndex 1000) stays on top
              ...(badgeInlineStyle || {}),
            }}
          >
            {badgeText}
          </span>
        )}

        {/* optional wishlist */}
        {product.showWishlist && (
          <a href="#" className="btn-wishlist">
            <svg width="24" height="24" aria-hidden>
              <use xlinkHref="#heart"></use>
            </svg>
          </a>
        )}

        <figure>
          <div
            onClick={goToProductDetail}
            title={product.name || "Product"}
            style={{ cursor: "pointer" }}
            onMouseEnter={startRotation}
            onMouseLeave={stopRotation}
            onFocus={startRotation}
            onBlur={stopRotation}
          >
            <img
              src={currentSrc}
              className="tab-image img-fluid"
              alt={product.name || "Produk"}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/images/placeholder.png";
              }}
            />
          </div>
        </figure>

        <h3
          className="h6 mt-2 mb-1"
          onClick={goToProductDetail}
          style={{ cursor: "pointer" }}
        >
          {product.name}
        </h3>

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
                  onClick={() => {
                    setSelectedVariant(v);
                    // jika ada gambar yang sesuai dengan index varian, tampilkan langsung
                    if (images && images[i]) {
                      setCurrentImageIndex(i);
                    }
                  }}
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
            onClick={onAddToCartClick}
          >
            Add to Cart <i className="uil uil-shopping-cart ms-1"></i>
          </button>
        </div>
      </div>

      {/* Variant selection modal */}
      {showVariantModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="variant-modal"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          {/* backdrop */}
          <div
            className="variant-modal-backdrop"
            onClick={() => setShowVariantModal(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
            }}
          />

          <div
            className="variant-modal-content card"
            style={{
              position: "relative",
              zIndex: 2100,
              width: "100%",
              maxWidth: 560,
              padding: 20,
              borderRadius: 12,
              boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
              background: "#fff",
            }}
          >
            {/* close button */}
            <button
              aria-label="Close variant selector"
              onClick={() => setShowVariantModal(false)}
              style={{
                position: "absolute",
                right: 12,
                top: 12,
                border: "none",
                background: "transparent",
                fontSize: 20,
                cursor: "pointer",
              }}
            >
              ✕
            </button>

            <h5 style={{ marginTop: 4, marginBottom: 12 }}>{product.name}</h5>
            <p style={{ marginTop: 0, marginBottom: 12, color: "#666" }}>
              Pilih varian stiker
            </p>

            <div
              className="variant-options"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: 12,
                marginBottom: 16,
              }}
            >
              {images.map((img, idx) => {
                const label = getLabelForIndex(idx);
                const stockVal = getStockForIndex(idx);
                const isSelected = modalSelectedIndex === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setModalSelectedIndex(idx)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setModalSelectedIndex(idx);
                      }
                    }}
                    style={{
                      border: isSelected
                        ? "2px solid #0b1957"
                        : "1px solid #e6e6e6",
                      padding: 8,
                      borderRadius: 8,
                      cursor: "pointer",
                      textAlign: "center",
                      background: isSelected ? "#f7f9ff" : "#fff",
                    }}
                  >
                    <img
                      src={img}
                      alt={label}
                      style={{
                        width: "100%",
                        height: 100,
                        objectFit: "cover",
                        marginBottom: 8,
                      }}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/images/placeholder.png";
                      }}
                    />
                    <div style={{ fontSize: 13, marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      {stockVal === null || stockVal === undefined
                        ? "Stok: N/A"
                        : `Stok: ${stockVal}`}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setShowVariantModal(false)}
                className="btn btn-outline-secondary"
                style={{ borderRadius: 8, padding: "8px 14px" }}
              >
                Batal
              </button>
              <button
                onClick={confirmVariantAndAddToCart}
                className="btn btn-primary"
                style={{ borderRadius: 8, padding: "8px 14px" }}
              >
                Tambah ke Keranjang
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
