// src/pages/ProductDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDatabase, ref, onValue, update } from "firebase/database";
import QuantityPicker from "../components/quantityPicker";
import { useCart } from "../contexts/CartContext"; // pakai useCart (usercart)

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [availableColors, setAvailableColors] = useState([]);
  const [selectedColor, setSelectedColor] = useState(null);
  const [qty, setQty] = useState(1);
  // <-- ambil juga cart & updateItemQty dari context agar bisa merge/merge qty
  const { addToCart, cart = [], updateItemQty } = useCart();

  const shippingCost = 10000;

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    const db = getDatabase();
    const productRef = ref(db, `products/${productId}`);

    const unsubscribe = onValue(
      productRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const productData = snapshot.val();
          // set product (ambil nilai stok default dari DB jika ada)
          setProduct({
            id: productId,
            ...productData,
          });

          // setup variant default
          if (productData.variants && productData.variants.length > 0) {
            setSelectedVariant(productData.variants[0]);
          } else if (productData.color) {
            setSelectedVariant(productData.color);
          } else {
            setSelectedVariant(null);
          }

          // Build availableColors dari DB (colorOptions) atau dari image fields
          if (
            Array.isArray(productData.colorOptions) &&
            productData.colorOptions.length > 0
          ) {
            const colors = productData.colorOptions.map((c, i) => ({
              name: c.name || c.label || `Varian ${i + 1}`,
              value: c.value || c.hex || null,
              code: c.code || `color${i + 1}`,
              image: c.image || null,
              imageField: c.imageField || null,
            }));
            setAvailableColors(colors);
            setSelectedColor(colors[0]);
          } else {
            // cari semua field yang mulai dengan 'image' (image, image1, image2, ...)
            const keys = Object.keys(productData).filter(
              (k) =>
                typeof productData[k] === "string" &&
                productData[k] &&
                k.toLowerCase().startsWith("image")
            );

            if (keys.length > 0) {
              const namesArr = Array.isArray(productData.colorNames)
                ? productData.colorNames
                : Array.isArray(productData.colorLabels)
                ? productData.colorLabels
                : null;

              const colors = keys.map((key, idx) => ({
                name:
                  (namesArr && namesArr[idx]) ||
                  (idx === 0 ? "Varian 1" : `Varian ${idx + 1}`),
                value: null,
                code: key, // mis. image, image1, image2
                image: productData[key] || null,
                imageField: key,
              }));
              setAvailableColors(colors);
              setSelectedColor(colors[0]);
            } else {
              // fallback single image
              const fallback = [
                {
                  name: productData.name || "Default",
                  value: null,
                  code: "default",
                  image: productData.image || null,
                  imageField: productData.image ? "image" : null,
                },
              ];
              setAvailableColors(fallback);
              setSelectedColor(fallback[0]);
            }
          }
        } else {
          setProduct(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching product:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [productId]);

  // helper: ambil gambar berdasarkan selectedColor / product
  function selectedImageForProduct(prod, color) {
    if (!prod) return "/images/placeholder.png";
    if (!color) return prod.image || "/images/placeholder.png";
    if (color.image) return color.image;
    if (color.imageField && prod[color.imageField])
      return prod[color.imageField];
    return prod.image || "/images/placeholder.png";
  }

  // helper kecil: buat string unik untuk variant dan color
  function serializeForId(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") {
      return value.replace(/\s+/g, "-").replace(/[^\w-.:]/g, "");
    }
    if (typeof value === "object") {
      return (
        (value.code && String(value.code)) ||
        (value.name && String(value.name)) ||
        (value.value && String(value.value)) ||
        JSON.stringify(value)
      )
        .replace(/\s+/g, "-")
        .replace(/[^\w-.:]/g, "");
    }
    return String(value)
      .replace(/\s+/g, "-")
      .replace(/[^\w-.:]/g, "");
  }

  // generate unique cart id per combination product + variant + color
  // (tetap ada tapi tidak lagi dipakai untuk id utama; tidak menghapus agar logic lain tetap utuh)
  function makeCartItemId(prodId, variant, color) {
    const v = serializeForId(variant);
    const c = serializeForId(color);
    if (!v && !c) return prodId; // no spec -> plain product id
    return `${prodId}::v=${v}::c=${c}`;
  }

  // Helper: map imageField -> stock field name
  function imageFieldToStockField(imageField) {
    if (!imageField) return "stock";
    const key = String(imageField || "").toLowerCase();
    if (key === "image" || key === "image0") return "stock";
    if (key === "image1") return "stock1";
    if (key === "image2") return "stock2";
    // if image field contains '1' or '2' at end, try to detect
    if (key.endsWith("1")) return "stock1";
    if (key.endsWith("2")) return "stock2";
    return "stock";
  }

  // New: get stock value for selected variant/color
  function getVariantStock(prod, color, variant) {
    try {
      if (!prod) return 0;
      // 1) if color has imageField -> map directly
      if (color && color.imageField) {
        const stockField = imageFieldToStockField(color.imageField);
        const val = prod[stockField];
        return Number(val ?? 0);
      }

      // 2) if color has image -> match against image/image1/image2
      if (color && color.image) {
        if (prod.image && prod.image === color.image)
          return Number(prod.stock ?? 0);
        if (prod.image1 && prod.image1 === color.image)
          return Number(prod.stock1 ?? 0);
        if (prod.image2 && prod.image2 === color.image)
          return Number(prod.stock2 ?? 0);
      }

      // 3) if variant index-like (e.g. variant === 0/1/2) -> map by index
      if (variant !== null && variant !== undefined) {
        const maybeIdx = Number(variant);
        if (!Number.isNaN(maybeIdx)) {
          if (maybeIdx === 0) return Number(prod.stock ?? 0);
          if (maybeIdx === 1) return Number(prod.stock1 ?? 0);
          if (maybeIdx === 2) return Number(prod.stock2 ?? 0);
        }
        // sometimes variant is a string like 'Varian 2' -> try to detect digit
        const m = String(variant).match(/\d+/);
        if (m) {
          const idx = Number(m[0]) - 1; // human number -> index
          if (idx === 0) return Number(prod.stock ?? 0);
          if (idx === 1) return Number(prod.stock1 ?? 0);
          if (idx === 2) return Number(prod.stock2 ?? 0);
        }
      }

      // 4) fallback: prefer stock, else stock1, else stock2
      if (prod.hasOwnProperty("stock")) return Number(prod.stock ?? 0);
      if (prod.hasOwnProperty("stock1")) return Number(prod.stock1 ?? 0);
      if (prod.hasOwnProperty("stock2")) return Number(prod.stock2 ?? 0);
      return 0;
    } catch (e) {
      console.error("getVariantStock error:", e);
      return 0;
    }
  }

  // handler add to cart (gunakan addToCart dari context)
  async function addToCartHandler() {
    if (!product) return;

    const currentVariantStock = getVariantStock(
      product,
      selectedColor,
      selectedVariant
    );

    if (currentVariantStock < qty) {
      alert(
        `Maaf, stok tidak mencukupi untuk varian ini. Stok tersedia: ${currentVariantStock}`
      );
      return;
    }

    // === Perubahan logika: gunakan id sederhana (product.id) sesuai struktur DB Anda ===
    const simpleId = product.id;

    // prepare payload matching DB structure (types sanitized)
    const payload = {
      id: simpleId, // "product-1"
      image:
        selectedImageForProduct(product, selectedColor) ||
        product.image ||
        "/images/placeholder.png",
      name: product.name || "",
      price: Number(product.price) || 0,
      qty: Number(qty) || 1,
      size: product.size || "",
      // keep metadata but not part of id
      variant: selectedVariant,
      color: selectedColor,
      productId: product.id,
      shippingCost,
    };

    // check existing item in cart by simple id (product.id)
    const existing = (cart || []).find((ci) => ci.id === simpleId);

    if (existing && typeof updateItemQty === "function") {
      // merge qty: tambah ke existing.qty
      const newQty = Number(existing.qty || 0) + Number(payload.qty || 0);
      updateItemQty({
        _cid: existing._cid, // kalau context menggunakan _cid
        id: existing.id,
        variant: payload.variant,
        qty: newQty,
      });
    } else {
      // add new item (payload matches screenshot DB)
      addToCart(payload);
    }

    alert(
      `${product.name} (${
        selectedColor?.name || selectedVariant || "Default"
      }) berhasil ditambahkan ke cart!`
    );
  }

  // gunakan helper yang konsisten
  const selectedImage = selectedImageForProduct(product, selectedColor);

  // compute current stock for selected variant
  const currentVariantStock = getVariantStock(
    product,
    selectedColor,
    selectedVariant
  );

  // ensure qty does not exceed stock when product or variant changes
  useEffect(() => {
    if (qty > currentVariantStock) {
      setQty(currentVariantStock > 0 ? currentVariantStock : 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVariantStock, productId, selectedColor, selectedVariant]);

  // (optional) function to update product.stock (ke root stock) - keep but do not use for variant updates
  const updateStock = async (productIdArg, quantity) => {
    const db = getDatabase();
    const productRef = ref(db, `products/${productIdArg}`);

    try {
      const currentStock = Number(product?.stock ?? 0);
      const newStock = Math.max(0, currentStock - quantity);

      await update(productRef, {
        stock: newStock,
      });

      return true;
    } catch (error) {
      console.error("Error updating stock:", error);
      return false;
    }
  };

  function getProductDescription(prod) {
    if (!prod) return "";
    if (prod.description) {
      return prod.description;
    }

    const productName = (prod.name || "").toLowerCase();

    if (
      productName.includes("juice") ||
      productName.includes("drink") ||
      productName.includes("beverage")
    ) {
      return `Enjoy the refreshing taste of our ${prod.name}, made from 100% natural ingredients. Perfect for hot days, this beverage is packed with vitamins and natural sweetness. No added preservatives or artificial flavors. Stay hydrated and healthy with every sip.`;
    }

    if (
      productName.includes("biscuit") ||
      productName.includes("cookie") ||
      productName.includes("snack")
    ) {
      return `Our premium ${prod.name} are baked to perfection with the finest ingredients. Crispy, buttery, and delicious - perfect for tea time or as a quick snack. Each piece is carefully crafted for the ultimate taste experience. Great for sharing with family and friends.`;
    }

    if (productName.includes("sticker") || productName.includes("decals")) {
      return `High-quality ${prod.name} made with durable vinyl material. Perfect for personalizing your laptop, water bottle, phone case, or any smooth surface. Easy to apply and remove without leaving residue. Water-resistant and long-lasting. Express your style with our unique designs.`;
    }

    return `${prod.name} is a premium quality product designed for your satisfaction. Made with excellent craftsmanship and attention to detail, this product offers great value and performance. Perfect for everyday use or as a special gift.`;
  }

  function getButtonPropsFromColor(color) {
    // Warna dasar orange cerah (#ffc43f)
    const orange = "#ffc43f";
    const white = "#ffffff"; // putih supaya kontras dan tetap elegan

    if (!color) {
      return {
        className: "btn btn-lg",
        style: {
          backgroundColor: orange,
          color: white,
          border: "1px solid #e0d6c5",
        },
      };
    }

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

    if (bsVariants.includes(color.code)) {
      return {
        className: `btn btn-${color.code} btn-lg`,
        style: {
          backgroundColor: orange,
          color: white,
        },
      };
    }

    if (color.value) {
      return {
        className: "btn btn-lg",
        style: {
          backgroundColor: color.value,
          color: getContrastColor(color.value),
        },
      };
    }

    return {
      className: "btn btn-lg",
      style: {
        backgroundColor: orange,
        color: white,
      },
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

  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <h2>Product Not Found</h2>
          <button
            className="btn btn-primary mt-3"
            onClick={() => navigate("/")}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const rawPrice = product.price;
  const priceNum =
    typeof rawPrice === "number" ? rawPrice : parseFloat(rawPrice);
  const safePrice = Number.isFinite(priceNum) ? priceNum : 0;
  const totalPrice = safePrice * qty + shippingCost;
  const currentStock = currentVariantStock; // stok sesuai varian yang dipilih

  const btnProps = getButtonPropsFromColor(selectedColor);

  return (
    <div className="container py-5">
      <div className="row">
        <div className="col-md-6">
          <img
            src={selectedImage || product.image || "/images/placeholder.png"}
            className="img-fluid rounded shadow-sm"
            alt={`${product.name} - ${selectedColor?.name || ""}`}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/images/placeholder.png";
            }}
          />
        </div>

        <div className="col-md-6">
          <button
            className="btn btn-outline-secondary mb-4"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>

          <h1 className="h2 mb-3">{product.name}</h1>

          {product.size && (
            <p className="text-muted mb-3">Size: {product.size}</p>
          )}

          <div className="stock-info mb-3">
            {(() => {
              const bgClass =
                currentStock > 10
                  ? "bg-success"
                  : currentStock > 0
                  ? "bg-warning"
                  : "bg-danger";
              const textClass =
                bgClass === "bg-warning" ? "text-dark" : "text-white";
              // juga tampilkan keterangan varian jika ada
              const variantLabel =
                selectedColor?.name ||
                (selectedVariant ? String(selectedVariant) : "Default");
              return (
                <span
                  className={`badge ${bgClass} ${textClass}`}
                  style={{ opacity: 1 }}
                >
                  <i className="uil uil-package me-1"></i>
                  Stok ({variantLabel}): {currentStock} pcs
                </span>
              );
            })()}

            {currentStock <= 10 && currentStock > 0 && (
              <small
                className="ms-2"
                style={{
                  display: "inline-block",
                  backgroundColor: "#ff7a00", // oranye
                  color: "#ffffff",
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                Stok hampir habis!
              </small>
            )}
            {currentStock === 0 && (
              <small
                className="ms-2"
                style={{
                  display: "inline-block",
                  backgroundColor: "#ff0000ff", // merah
                  color: "#ffffff",
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                Stok Kosong!
              </small>
            )}
          </div>

          <div className="price my-4">
            <h3 className="text-primary">Rp{safePrice.toFixed(2)}</h3>
          </div>

          <div className="mb-4">
            <h5 className="mb-3">Product Description</h5>
            <div
              className="product-description text-muted"
              style={{
                lineHeight: "1.6",
                whiteSpace: "pre-line",
                fontSize: "1rem",
              }}
            >
              {getProductDescription(product)}
            </div>
          </div>

          {/* HANYA tampilkan pilihan varian jika ada lebih dari 1 */}
          {availableColors && availableColors.length > 1 && (
            <div className="mb-4">
              <h6 className="mb-3">
                <i className="uil uil-palette me-2"></i>
                Pilih Varian:
              </h6>
              <div className="d-flex gap-3 flex-wrap">
                {availableColors.map((color, index) => (
                  <div
                    key={index}
                    className={`color-option text-center ${
                      selectedColor?.code === color.code ? "selected" : ""
                    }`}
                    onClick={() => setSelectedColor(color)}
                    style={{ cursor: "pointer", width: 90 }}
                  >
                    {color.value ? (
                      <div
                        className="color-swatch rounded-circle mb-2"
                        style={{
                          width: "40px",
                          height: "40px",
                          backgroundColor: color.value,
                          border:
                            selectedColor?.code === color.code
                              ? "3px solid #007bff"
                              : "2px solid #dee2e6",
                          margin: "0 auto",
                        }}
                        title={color.name}
                      />
                    ) : (
                      <div style={{ marginBottom: 6 }}>
                        <img
                          src={
                            color.image ||
                            (color.imageField && product[color.imageField]) ||
                            "/images/placeholder.png"
                          }
                          alt={color.name}
                          style={{
                            width: 48,
                            height: 48,
                            objectFit: "cover",
                            borderRadius: 8,
                            border:
                              selectedColor?.code === color.code
                                ? "3px solid #007bff"
                                : "2px solid #dee2e6",
                          }}
                        />
                      </div>
                    )}

                    <small
                      className="text-muted d-block"
                      style={{
                        maxWidth: 80,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {color.name}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Variants Section */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-4">
              <h6 className="mb-3">
                <i className="uil uil-palette me-2"></i>
                Available Variants:
              </h6>
              <div className="d-flex gap-2 flex-wrap">
                {product.variants.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`btn btn-outline-primary ${
                      selectedVariant === v ? "active" : ""
                    }`}
                    onClick={() => setSelectedVariant(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="shipping-info mb-4 p-3 bg-light rounded">
            <h6 className="mb-2">Informasi Pengiriman:</h6>
            <div className="row">
              <div className="col-6">
                <small className="text-muted">Lokasi:</small>
                <p className="mb-1 small fw-bold">Airmadidi</p>
              </div>
              <div className="col-6">
                <small className="text-muted">Ongkir:</small>
                <p className="mb-1 small fw-bold">
                  Rp{shippingCost.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3 mb-4">
            <label className="form-label mb-0 fw-bold">Quantity:</label>
            <QuantityPicker qty={qty} onChange={setQty} max={currentStock} />
          </div>

          <button
            {...(btnProps.style ? { style: btnProps.style } : {})}
            className={btnProps.className + " w-100 py-3 fw-bold"}
            onClick={addToCartHandler}
            disabled={currentStock === 0 || qty > currentStock}
          >
            <i className="uil uil-shopping-cart me-2"></i>
            {currentStock === 0
              ? "Stok Habis"
              : `Add to Cart (${
                  selectedColor?.name || selectedVariant || "Default"
                })`}
          </button>
        </div>
      </div>
    </div>
  );
}
