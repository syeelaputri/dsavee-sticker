import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { useCart } from "../contexts/CartContext";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedColors, setSelectedColors] = useState({});
  const { addToCart } = useCart();

  // Shipping information
  const shippingInfo = {
    district: "Airmadidi",
    cost: 12000,
    estimatedDays: "1-2 hari",
  };

  // Styles
  const styles = {
    productsPage: {
      minHeight: "100vh",
    },
    productsHeader: {
      background: "linear-gradient(135deg, #007bff 0%, #0056b3 100%)",
      padding: "2rem 0",
      color: "white",
    },
    shippingBanner: {
      backgroundColor: "#f8f9fa",
      padding: "0.75rem 0",
      borderBottom: "1px solid #dee2e6",
    },
    productCard: {
      transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
      border: "1px solid #e9ecef",
      height: "100%",
    },
    productImageContainer: {
      position: "relative",
      overflow: "hidden",
      backgroundColor: "#f8f9fa",
    },
    productImage: {
      height: "250px",
      objectFit: "cover",
      transition: "transform 0.3s ease",
    },
    soldOutBadge: {
      position: "absolute",
      top: "10px",
      right: "10px",
      background: "rgba(220, 53, 69, 0.9)",
      color: "white",
      padding: "5px 10px",
      borderRadius: "15px",
      fontSize: "0.8rem",
      fontWeight: "bold",
    },
    productName: {
      color: "#333",
      fontWeight: "600",
      minHeight: "48px",
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
    },
    productDescription: {
      display: "-webkit-box",
      WebkitLineClamp: 3,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
      minHeight: "60px",
      color: "#6c757d",
      fontSize: "0.875rem",
    },
    colorOptions: {
      margin: "15px 0",
    },
    colorButtons: {
      display: "flex",
      gap: "8px",
      marginBottom: "8px",
      flexWrap: "wrap",
    },
    colorBtn: {
      width: "30px",
      height: "30px",
      border: "2px solid #ddd",
      borderRadius: "50%",
      cursor: "pointer",
      transition: "all 0.2s ease",
      position: "relative",
    },
    colorBtnActive: {
      borderColor: "#007bff",
      transform: "scale(1.1)",
    },
    productMeta: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "15px",
    },
    productPrice: {
      color: "#007bff",
      fontWeight: "700",
      fontSize: "1.25rem",
    },
    addToCartBtn: {
      padding: "12px",
      fontWeight: "600",
      transition: "all 0.3s ease",
      border: "none",
      width: "100%",
    },
    infoCard: {
      transition: "transform 0.2s ease",
      padding: "1.5rem",
      border: "1px solid #dee2e6",
      borderRadius: "0.375rem",
      textAlign: "center",
      height: "100%",
    },
    emptyState: {
      padding: "60px 20px",
      textAlign: "center",
    },
    shippingInfo: {
      display: "flex",
      alignItems: "center",
      fontSize: "1.1rem",
    },
  };

  // Media query styles
  const mediaQueryStyles = `
    @media (max-width: 768px) {
      .products-header h1 {
        font-size: 1.8rem !important;
      }
      
      .product-image {
        height: 200px !important;
      }
      
      .product-meta {
        flex-direction: column !important;
        align-items: start !important;
        gap: 8px !important;
      }
      
      .shipping-info {
        font-size: 1rem !important;
        justify-content: center !important;
        text-align: center !important;
      }
      
      .color-buttons {
        justify-content: center !important;
      }
    }

    @media (max-width: 576px) {
      .product-card {
        margin-bottom: 20px !important;
      }
      
      .products-header {
        padding: 2rem 1rem !important;
      }
      
      .products-header h1 {
        font-size: 1.5rem !important;
      }
    }

    /* Hover effects */
    .product-card:hover {
      transform: translateY(-5px) !important;
      box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
    }

    .product-card:hover .product-image {
      transform: scale(1.05) !important;
    }

    .color-btn:hover {
      transform: scale(1.1) !important;
      border-color: #007bff !important;
    }

    .add-to-cart-btn:not(:disabled):hover {
      background-color: #0056b3 !important;
      transform: translateY(-2px) !important;
    }

    .info-card:hover {
      transform: translateY(-3px) !important;
    }

    .color-btn.active::after {
      content: '✓' !important;
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      color: white !important;
      font-size: 12px !important;
      font-weight: bold !important;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5) !important;
    }
  `;

  // Fetch products from Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const productsData = [];
        querySnapshot.forEach((doc) => {
          productsData.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        setProducts(productsData);

        // Initialize selected colors
        const initialColors = {};
        productsData.forEach((product) => {
          if (product.colors && product.colors.length > 0) {
            initialColors[product.id] = product.colors[0];
          }
        });
        setSelectedColors(initialColors);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleColorSelect = (productId, color) => {
    setSelectedColors((prev) => ({
      ...prev,
      [productId]: color,
    }));
  };

  const handleAddToCart = (product) => {
    const selectedColor = selectedColors[product.id];
    addToCart({
      ...product,
      selectedColor: selectedColor,
      quantity: 1,
    });

    // Show success message
    alert(`${product.name} telah ditambahkan ke keranjang!`);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="container my-5">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Memuat produk...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.productsPage}>
      {/* Inject CSS media queries and hover effects */}
      <style>{mediaQueryStyles}</style>

      {/* Header Section */}
      <div style={styles.productsHeader} className="products-header">
        <div className="container">
          <h1 className="text-center mb-3">Sticker Collection</h1>
          <p className="text-center mb-0">
            Temukan stiker lucu, aesthetic, dan kreatif untuk laptop, HP,
            planner, atau hadiah
          </p>
        </div>
      </div>

      {/* Shipping Banner */}
      <div style={styles.shippingBanner} className="shipping-banner">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-8">
              <div style={styles.shippingInfo} className="shipping-info">
                <i className="fas fa-shipping-fast me-2"></i>
                <strong>Gratis Ongkir:</strong> {shippingInfo.district} -{" "}
                {formatPrice(shippingInfo.cost)}
                <span className="text-muted ms-2">
                  (Estimasi: {shippingInfo.estimatedDays})
                </span>
              </div>
            </div>
            <div className="col-md-4 text-end">
              <small className="text-muted">
                *Hanya untuk kecamatan {shippingInfo.district}
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container my-5">
        <div className="row">
          {products.length > 0 ? (
            products.map((product) => (
              <div key={product.id} className="col-lg-4 col-md-6 mb-4">
                <div
                  style={styles.productCard}
                  className="product-card card h-100 shadow-sm"
                >
                  {/* Product Image */}
                  <div
                    style={styles.productImageContainer}
                    className="product-image-container"
                  >
                    <img
                      src={product.imageUrl || "/default-product.jpg"}
                      alt={product.name}
                      style={styles.productImage}
                      className="product-image card-img-top"
                      onError={(e) => {
                        e.target.src = "/default-product.jpg";
                      }}
                    />
                    {product.stock === 0 && (
                      <div
                        style={styles.soldOutBadge}
                        className="sold-out-badge"
                      >
                        Habis
                      </div>
                    )}
                  </div>

                  <div className="card-body d-flex flex-column">
                    {/* Product Name */}
                    <h5
                      style={styles.productName}
                      className="product-name card-title"
                    >
                      {product.name}
                    </h5>

                    {/* Product Description */}
                    <p
                      style={styles.productDescription}
                      className="product-description card-text"
                    >
                      {product.description}
                    </p>

                    {/* Color Options */}
                    {product.colors && product.colors.length > 0 && (
                      <div
                        style={styles.colorOptions}
                        className="color-options"
                      >
                        <label className="form-label small fw-bold mb-2">
                          Pilihan Warna:
                        </label>
                        <div
                          style={styles.colorButtons}
                          className="color-buttons"
                        >
                          {product.colors.map((color) => (
                            <button
                              key={color}
                              style={{
                                ...styles.colorBtn,
                                backgroundColor: color,
                                ...(selectedColors[product.id] === color
                                  ? styles.colorBtnActive
                                  : {}),
                              }}
                              className={`color-btn ${
                                selectedColors[product.id] === color
                                  ? "active"
                                  : ""
                              }`}
                              onClick={() =>
                                handleColorSelect(product.id, color)
                              }
                              title={color}
                            />
                          ))}
                        </div>
                        <small className="text-muted">
                          Terpilih:{" "}
                          <strong>{selectedColors[product.id]}</strong>
                        </small>
                      </div>
                    )}

                    {/* Price and Stock */}
                    <div style={styles.productMeta} className="product-meta">
                      <div
                        style={styles.productPrice}
                        className="product-price"
                      >
                        {formatPrice(product.price)}
                      </div>
                      <div
                        className={`product-stock small ${
                          product.stock > 10
                            ? "text-success"
                            : product.stock > 0
                            ? "text-warning"
                            : "text-danger"
                        }`}
                      >
                        Stok:{" "}
                        {product.stock > 0
                          ? `${product.stock} tersedia`
                          : "Habis"}
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                    <div className="mt-auto">
                      <button
                        style={{
                          ...styles.addToCartBtn,
                          ...(product.stock === 0
                            ? {
                                backgroundColor: "#6c757d",
                                cursor: "not-allowed",
                              }
                            : {}),
                        }}
                        className={`btn add-to-cart-btn ${
                          product.stock === 0 ? "btn-secondary" : "btn-primary"
                        }`}
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock === 0}
                      >
                        {product.stock === 0 ? (
                          "Stok Habis"
                        ) : (
                          <>
                            <i className="fas fa-cart-plus me-2"></i>
                            Add to Cart
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-12 text-center py-5">
              <div style={styles.emptyState} className="empty-state">
                <i className="fas fa-box-open fa-3x text-muted mb-3"></i>
                <h4>Tidak ada produk tersedia</h4>
                <p className="text-muted">Silakan coba lagi nanti.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Info Section */}
      <div className="container my-5">
        <div className="row">
          <div className="col-md-4 mb-4">
            <div style={styles.infoCard} className="info-card">
              <i className="fas fa-shipping-fast fa-2x text-primary mb-3"></i>
              <h5>Pengiriman Cepat</h5>
              <p className="text-muted mb-0">
                Estimasi pengiriman 1-2 hari untuk wilayah Airmadidi
              </p>
            </div>
          </div>
          <div className="col-md-4 mb-4">
            <div style={styles.infoCard} className="info-card">
              <i className="fas fa-shield-alt fa-2x text-primary mb-3"></i>
              <h5>Kualitas Terjamin</h5>
              <p className="text-muted mb-0">
                Stiker waterproof dan tahan lama dengan bahan premium
              </p>
            </div>
          </div>
          <div className="col-md-4 mb-4">
            <div style={styles.infoCard} className="info-card">
              <i className="fas fa-headset fa-2x text-primary mb-3"></i>
              <h5>Customer Service</h5>
              <p className="text-muted mb-0">
                Tim support siap membantu 24/7 melalui WhatsApp
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
