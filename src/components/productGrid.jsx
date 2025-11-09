// src/components/ProductGrid.jsx
import React, { useEffect, useState } from "react";
import ProductCard from "./productCard"; // sesuaikan nama file/kapitalisasi jika diperlukan
import { getDatabase, ref, onValue } from "firebase/database";

/**
 * ProductGrid
 * props:
 *  - products (optional): array produk dari parent (jika parent sudah melakukan query)
 *  - filterKeyword (optional): satu kata kunci filter, mis: 'animal', 'anime', 'cute', ...
 */
export default function ProductGrid({
  products: productsProp = null,
  filterKeyword = null,
}) {
  // Semua produk yang kita punya (sumber = prop atau DB)
  const [allProducts, setAllProducts] = useState(
    Array.isArray(productsProp) ? productsProp : []
  );
  // Produk yang akan ditampilkan (setelah filter)
  const [displayProducts, setDisplayProducts] = useState(
    Array.isArray(productsProp) && productsProp.length > 0 ? productsProp : []
  );
  const [loading, setLoading] = useState(productsProp ? false : true);

  // Helper: normalisasi keyword field product -> array lowercased
  const normalizeKeywords = (p) => {
    if (!p) return [];
    const k = p.keyword ?? p.keywords ?? p.tags ?? null;
    if (!k) return [];
    if (Array.isArray(k))
      return k.map((x) => String(x).toLowerCase().trim()).filter(Boolean);
    // string -> split by comma/semicolon/pipe/slash/whitespace
    return String(k)
      .toLowerCase()
      .split(/[,;|\/\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const matchesFilter = (p, fk) => {
    if (!fk) return true; // no filter => always match
    const needle = String(fk).toLowerCase().trim();
    const kws = normalizeKeywords(p);
    if (kws.length === 0) return false;
    return kws.includes(needle);
  };

  // 1) Jika tidak ada productsProp, ambil dari RTDB
  useEffect(() => {
    if (Array.isArray(productsProp) && productsProp.length > 0) {
      // parent memberikan products -> gunakan itu
      setAllProducts(productsProp);
      setLoading(false);
      return;
    }

    setLoading(true);
    const db = getDatabase();
    const productsRef = ref(db, "products");

    const unsubscribe = onValue(
      productsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          // normalisasi object -> array
          const list = Array.isArray(data)
            ? data.map((item, idx) => ({ id: item?.id ?? idx, ...item }))
            : Object.keys(data).map((key) => ({ id: key, ...data[key] }));
          setAllProducts(list);
        } else {
          // Jika path products kosong -> jangan pakai fallback default, gunakan array kosong
          setAllProducts([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Firebase onValue error:", error);
        // pada error -> tampilkan list kosong (user akan melihat pesan "Tidak ada produk...")
        setAllProducts([]);
        setLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [productsProp]);

  // 2) Apply filter setiap kali allProducts atau filterKeyword berubah
  useEffect(() => {
    const fk = filterKeyword
      ? String(filterKeyword).toLowerCase().trim()
      : null;
    if (!fk) {
      // no filter -> tampilkan semua (atau kosong jika tidak ada produk)
      if (Array.isArray(allProducts) && allProducts.length > 0)
        setDisplayProducts(allProducts);
      else setDisplayProducts([]);
      return;
    }

    const filtered = (allProducts || []).filter((p) => matchesFilter(p, fk));
    setDisplayProducts(filtered);
  }, [allProducts, filterKeyword]);

  return (
    <div>
      {loading && (
        <div className="text-center py-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {!loading && displayProducts.length === 0 && (
        <div className="text-center py-4 text-muted">
          {filterKeyword ? (
            <p>Tidak ada produk ditemukan untuk filter "{filterKeyword}".</p>
          ) : (
            <p>Tidak ada produk tersedia saat ini.</p>
          )}
        </div>
      )}

      <div className="product-grid row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5">
        {displayProducts.map((p) => (
          <div className="col" key={p.id}>
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
