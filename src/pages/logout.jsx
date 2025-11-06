import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";

const Logout = () => {
  const navigate = useNavigate();
  const auth = getAuth();

  const [showModal, setShowModal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(""); // status messages (e.g. "Sedang keluar...")
  const [error, setError] = useState("");

  const handleCancel = () => {
    // Tutup modal dan kembali ke halaman sebelumnya
    setShowModal(false);
    navigate(-1);
  };

  const handleConfirm = async () => {
    setError("");
    setLoading(true);
    setMessage("Sedang keluar...");

    try {
      await signOut(auth);
      // hapus data lokal yang relevan
      localStorage.removeItem("admin");
      localStorage.removeItem("user");
      localStorage.removeItem("token");

      setMessage("Anda telah keluar.");
      setLoading(false);

      // beri waktu singkat untuk tampilkan pesan lalu redirect
      setTimeout(() => {
        navigate("/login");
      }, 900);
    } catch (err) {
      console.error("Logout error:", err);
      setLoading(false);
      setMessage("");
      setError("Terjadi kesalahan saat keluar. Silakan coba lagi.");
    }
  };

  // Jika modal ditutup (showModal false), jangan render apa-apa — navigate sudah dilakukan di handleCancel
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
        style={{
          width: "100%",
          maxWidth: 520,
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
          padding: 20,
        }}
      >
        {/* Jika sedang proses atau sudah ada message status, tampilkan status */}
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
          // Modal konfirmasi
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
