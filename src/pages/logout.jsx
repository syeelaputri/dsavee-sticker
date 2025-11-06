import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";

const GUEST_KEY = "guest_cart_v1";

const Logout = () => {
  const navigate = useNavigate();
  const { cart } = useCart();
  const { logout } = useAuth(); // gunakan logout dari AuthContext
  const [showModal, setShowModal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    if (showModal && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [showModal]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = () => {
    setShowModal(false);
    // navigasi kembali; jika tidak bisa, ke home
    try {
      navigate(-1);
    } catch {
      navigate("/");
    }
  };

  const handleConfirm = async () => {
    setError("");
    setLoading(true);
    setMessage("Sedang keluar...");

    try {
      // Simpan current cart ke localStorage sebagai guest sebelum logout (jika ada)
      try {
        if (cart && Array.isArray(cart) && cart.length > 0) {
          localStorage.setItem(GUEST_KEY, JSON.stringify(cart));
        }
      } catch (e) {
        console.warn("Gagal menyimpan guest cart sebelum logout:", e);
      }

      // Panggil logout dari AuthContext (centralized)
      if (typeof logout === "function") {
        await logout();
      } else {
        console.warn("logout function not available in AuthContext. Skipping.");
      }

      // Hapus keys lokal yang lain (jika ada)
      localStorage.removeItem("admin");
      localStorage.removeItem("user");
      localStorage.removeItem("token");

      setMessage("Anda telah keluar.");
      setLoading(false);

      setTimeout(() => {
        navigate("/login");
      }, 600);
    } catch (err) {
      console.error("Logout error:", err);
      setLoading(false);
      setMessage("");
      setError("Terjadi kesalahan saat keluar. Silakan coba lagi.");
    }
  };

  if (!showModal) return null;

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        ref={dialogRef}
        tabIndex={-1}
        style={{
          width: "100%",
          maxWidth: 520,
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
          padding: 20,
        }}
      >
        {loading || message ? (
          <div style={{ textAlign: "center", padding: "18px 8px" }}>
            {loading && (
              <div style={{ marginBottom: 12 }}>
                <div
                  className="spinner-border"
                  role="status"
                  style={{ width: 36, height: 36 }}
                >
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            <p style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>
              {message || "Menunggu..."}
            </p>
            {error && (
              <p style={{ marginTop: 10, color: "crimson" }}>{error}</p>
            )}
            {!loading && error && (
              <div style={{ marginTop: 14 }}>
                <button
                  className="btn btn-primary me-2"
                  onClick={handleConfirm}
                >
                  Coba Lagi
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={handleCancel}
                >
                  Kembali
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <h5 style={{ marginTop: 0 }}>Konfirmasi Logout</h5>
            <p style={{ marginBottom: 16 }}>
              Apakah Anda yakin ingin keluar dari akun Anda?
            </p>
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
            >
              <button
                className="btn btn-outline-secondary"
                onClick={handleCancel}
              >
                Batal
              </button>
              <button className="btn btn-danger" onClick={handleConfirm}>
                Ya, Logout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Logout;
