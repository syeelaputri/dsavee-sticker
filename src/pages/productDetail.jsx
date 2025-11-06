import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDatabase, ref, onValue, update } from "firebase/database";
import QuantityPicker from "../components/quantityPicker";
import { useCartDispatch } from "../contexts/index";

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [availableColors, setAvailableColors] = useState([]); // dari DB
  const [selectedColor, setSelectedColor] = useState(null);
  const [qty, setQty] = useState(1);
  const dispatch = useCartDispatch();

  // Ongkir tetap
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

          setProduct({
            id: productId,
            stock: 50,
            ...productData,
          });

          // default variant jika ada
          if (productData.variants && productData.variants.length > 0) {
            setSelectedVariant(productData.variants[0]);
          } else if (productData.color) {
            setSelectedVariant(productData.color);
          }

          // Build availableColors dari DB
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
                code: key,
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

  // pilih gambar berdasarkan selectedColor / product
  function getImageForColor(product, color) {
    if (!product) return "/images/placeholder.png";
    if (!color) {
      return product.image || "/images/placeholder.png";
    }
    if (color.image) return color.image;
    if (color.imageField && product[color.imageField])
      return product[color.imageField];
    return product.image || "/images/placeholder.png";
  }

  const selectedImage = getImageForColor(product, selectedColor);

  const updateStock = async (productId, quantity) => {
    const db = getDatabase();
    const productRef = ref(db, `products/${productId}`);

    try {
      // gunakan nullish coalescing agar 0 tetap 0
      const currentStock = product?.stock ?? 50;
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

  function getProductDescription(product) {
    if (product.description) {
      return product.description;
    }

    const productName = (product.name || "").toLowerCase();

    if (
      productName.includes("juice") ||
      productName.includes("drink") ||
      productName.includes("beverage")
    ) {
      return `Enjoy the refreshing taste of our ${product.name}, made from 100% natural ingredients. Perfect for hot days, this beverage is packed with vitamins and natural sweetness. No added preservatives or artificial flavors. Stay hydrated and healthy with every sip.`;
    }

    if (
      productName.includes("biscuit") ||
      productName.includes("cookie") ||
      productName.includes("snack")
    ) {
      return `Our premium ${product.name} are baked to perfection with the finest ingredients. Crispy, buttery, and delicious - perfect for tea time or as a quick snack. Each piece is carefully crafted for the ultimate taste experience. Great for sharing with family and friends.`;
    }

    if (productName.includes("sticker") || productName.includes("decals")) {
      return `High-quality ${product.name} made with durable vinyl material. Perfect for personalizing your laptop, water bottle, phone case, or any smooth surface. Easy to apply and remove without leaving residue. Water-resistant and long-lasting. Express your style with our unique designs.`;
    }

    return `${product.name} is a premium quality product designed for your satisfaction. Made with excellent craftsmanship and attention to detail, this product offers great value and performance. Perfect for everyday use or as a special gift.`;
  }

  async function addToCart() {
    if (!product) return;

    const currentStock = product?.stock ?? 50; // gunakan ?? bukan ||
    if (currentStock < qty) {
      alert(`Maaf, stok tidak mencukupi. Stok tersedia: ${currentStock}`);
      return;
    }

    // hanya tambahkan ke cart, jangan ubah stok
    dispatch({
      type: "ADD_ITEM",
      payload: {
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        qty: Number(qty) || 1,
        size: product.size,
        image: selectedImage,
        variant: selectedVariant,
        color: selectedColor,
        shippingCost,
      },
    });

    alert(
      `${product.name} (${selectedColor?.name}) berhasil ditambahkan ke cart!`
    );
  }

  function getButtonPropsFromColor(color) {
    if (!color) return { className: "btn btn-primary btn-lg" };
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
      return { className: `btn btn-${color.code} btn-lg` };
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
    return { className: "btn btn-lg" };
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
  const currentStock = product.stock ?? 50;

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
            ← Back to Products
          </button>

          <h1 className="h2 mb-3">{product.name}</h1>

          {product.size && (
            <p className="text-muted mb-3">
              <i className="uil uil-ruler me-2"></i>
              Size: {product.size}
            </p>
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
              return (
                <span
                  className={`badge ${bgClass} ${textClass}`}
                  style={{ opacity: 1 }}
                >
                  <i className="uil uil-package me-1"></i>
                  Stok: {currentStock} pcs
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
                Pilih Warna / Varian:
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
            <h6 className="mb-2">
              <i className="uil uil-truck me-2"></i>
              Informasi Pengiriman:
            </h6>
            <div className="row">
              <div className="col-6">
                <small className="text-muted">Lokasi:</small>
                <p className="mb-1 small fw-bold">Kecamatan Airmadidi</p>
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

          <div className="total-price mb-4 p-3 bg-primary text-white rounded">
            <div className="d-flex justify-content-between">
              <span>Subtotal:</span>
              <span>Rp{(safePrice * qty).toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span>Ongkir:</span>
              <span>Rp{shippingCost.toFixed(2)}</span>
            </div>
            <hr className="my-2" />
            <div className="d-flex justify-content-between fw-bold">
              <span>Total:</span>
              <span>Rp{totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <button
            {...(btnProps.style ? { style: btnProps.style } : {})}
            className={btnProps.className + " w-100 py-3 fw-bold"}
            onClick={addToCart}
            disabled={currentStock === 0 || qty > currentStock}
          >
            <i className="uil uil-shopping-cart me-2"></i>
            {currentStock === 0
              ? "Stok Habis"
              : `Add to Cart (${selectedColor?.name})`}
          </button>

          <div className="mt-4 pt-3 border-top">
            <div className="row text-center">
              <div className="col-4">
                <i
                  className="uil uil-truck text-primary mb-2"
                  style={{ fontSize: "1.5rem" }}
                ></i>
                <p className="small mb-0">Airmadidi Only</p>
              </div>
              <div className="col-4">
                <i
                  className="uil uil-shield-check text-primary mb-2"
                  style={{ fontSize: "1.5rem" }}
                ></i>
                <p className="small mb-0">Quality Guarantee</p>
              </div>
              <div className="col-4">
                <i
                  className="uil uil-package text-primary mb-2"
                  style={{ fontSize: "1.5rem" }}
                ></i>
                <p className="small mb-0 fw-bold">Stock: {currentStock}</p>{" "}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
