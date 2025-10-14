// src/components/ProductGrid.jsx
import React, { useEffect, useState } from "react";
import ProductCard from "./productCard"; // sesuaikan nama file/kapitalisasi jika diperlukan
import { getDatabase, ref, onValue } from "firebase/database";

export default function ProductGrid({ products: productsProp }) {
  // productsProp = optional array passed dari parent; kalau tidak ada kita pakai state internal
  const [products, setProducts] = useState(productsProp ?? DEFAULT_PRODUCTS);

  useEffect(() => {
    // jika parent memberikan products lewat props, kita tidak override dengan DB (opsional)
    if (Array.isArray(productsProp) && productsProp.length > 0) return;

    // Ambil semua produk dari Realtime Database pada node "products"
    const db = getDatabase();
    const productsRef = ref(db, "products");

    const unsubscribe = onValue(
      productsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          // data kemungkinan berbentuk object { id1: {...}, id2: {...} }
          const list = Array.isArray(data)
            ? data.map((item, idx) => ({ id: item?.id ?? idx, ...item }))
            : Object.keys(data).map((key) => ({ id: key, ...data[key] }));
          setProducts(list);
        } else {
          // jika tidak ada data, biarkan tetap pakai DEFAULT_PRODUCTS
          console.log("No data available at 'products' path");
          setProducts(DEFAULT_PRODUCTS);
        }
      },
      (error) => {
        console.error("Firebase onValue error:", error);
        setProducts(DEFAULT_PRODUCTS);
      }
    );

    // cleanup listener saat komponen unmount
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [productsProp]); // re-run jika props berubah

  return (
    <div className="product-grid row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5">
      {products.map((p) => (
        <div className="col" key={p.id}>
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}

// fallback sample product(s)
const DEFAULT_PRODUCTS = [
  {
    id: "p1",
    name: "Sunstar Fresh Melon Juice",
    price: 18.0,
    image: "/images/thumb-bananas.png",
    size: "500ml",
  },
  {
    id: "p2",
    name: "Biscuits",
    price: 12.5,
    image: "/images/thumb-biscuits.png",
    size: "200g",
  },
];
