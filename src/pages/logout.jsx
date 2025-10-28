// src/pages/Logout.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";

const Logout = () => {
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const confirmLogout = window.confirm("Apakah Anda yakin ingin keluar?");
    if (confirmLogout) {
      // Jika user menekan "OK", lakukan logout
      setMessage("Sedang keluar...");
      signOut(auth)
        .then(() => {
          localStorage.removeItem("admin");
          setMessage("Anda telah keluar.");
          setTimeout(() => navigate("/login"), 2000); // Redirect ke login
        })
        .catch(() => {
          setMessage("Terjadi kesalahan saat keluar. Silakan coba lagi.");
        });
    } else {
      // Jika user menekan "Batal", kembali ke halaman sebelumnya
      navigate(-1);
    }
  }, [auth, navigate]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "18px",
        color: "#333",
        fontWeight: "500",
      }}
    >
      {message || "Menunggu konfirmasi..."}
    </div>
  );
};

export default Logout;
