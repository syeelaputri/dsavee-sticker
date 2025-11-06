import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDatabase, ref, onValue, update } from "firebase/database";
import QuantityPicker from "../components/quantityPicker";
import { useCart } from "../contexts/CartContext"; // <-- gunakan useCart

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [availableColors, setAvailableColors] = useState([]);
  const [selectedColor, setSelectedColor] = useState(null);
  const [qty, setQty] = useState(1);
  const { addToCart } = useCart(); // <-- ambil addToCart

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
          // setup variant/color seperti sebelumnya...
          if (productData.variants && productData.variants.length > 0) {
            setSelectedVariant(productData.variants[0]);
          } else if (productData.color) {
            setSelectedVariant(productData.color);
          }
          // build availableColors (sama logic as before)
          // ...
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

  async function addToCartHandler() {
    if (!product) return;
    const currentStock = product?.stock ?? 50;
    if (currentStock < qty) {
      alert(`Maaf, stok tidak mencukupi. Stok tersedia: ${currentStock}`);
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      qty: Number(qty) || 1,
      size: product.size,
      image: selectedImageForProduct(product, selectedColor),
      variant: selectedVariant,
      color: selectedColor,
      shippingCost,
    });

    alert(
      `${product.name} (${
        selectedColor?.name || ""
      }) berhasil ditambahkan ke cart!`
    );
  }

  // helper kecil (ambil image)
  function selectedImageForProduct(product, color) {
    if (!product) return "/images/placeholder.png";
    if (!color) return product.image || "/images/placeholder.png";
    if (color.image) return color.image;
    if (color.imageField && product[color.imageField])
      return product[color.imageField];
    return product.image || "/images/placeholder.png";
  }

  // ... rest UI sama seperti sebelumnya
  return (
    <div className="container py-5">
      {/* ... UI */}
      <button
        className={/* styling as before */ "btn btn-primary w-100 py-3 fw-bold"}
        onClick={addToCartHandler}
        disabled={product?.stock === 0 || qty > (product?.stock ?? 50)}
      >
        <i className="uil uil-shopping-cart me-2"></i>
        {product?.stock === 0
          ? "Stok Habis"
          : `Add to Cart (${selectedColor?.name || ""})`}
      </button>
      {/* ... */}
    </div>
  );
}
