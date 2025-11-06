import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, rtdb } from "../firebase";
import { ref, get, set, update } from "firebase/database";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../css/style.css";

const ensureRTDBUser = async (user) => {
  const userRef = ref(rtdb, `users/${user.uid}`);
  const snap = await get(userRef);
  if (!snap.exists()) {
    // jika tidak ada record di DB -> return false (caller akan sign out)
    return false;
  }
  // ada record -> bisa update updatedAt dan return true
  await update(userRef, { updatedAt: new Date().toISOString() });
  return true;
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = credential.user || auth.currentUser;
      if (!user) throw new Error("User tidak ditemukan.");

      // cek RTDB apakah ada record untuk uid ini
      const ok = await ensureRTDBUser(user);
      if (!ok) {
        // kalau tidak ada, sign out dan beri pesan
        try {
          await signOut(auth);
        } catch (_) {}
        setError(
          "Akun tidak ditemukan di database. Silakan daftar terlebih dahulu."
        );
        return;
      }

      // berhasil -> arahkan
      navigate("/products");
    } catch (err) {
      console.error("Email login error:", err);
      setError("Email atau password salah.");
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      // jika user belum ada di RTDB, buat record
      const userRef = ref(rtdb, `users/${user.uid}`);
      const snapshot = await get(userRef);
      if (!snapshot.exists()) {
        await set(userRef, {
          uid: user.uid,
          email: user.email || "",
          name:
            user.displayName ||
            (user.email ? user.email.split("@")[0] : "Nama Pengguna"),
          phone: "+62 812 3456 7890",
          address: "Jl. Contoh Alamat No. 123, Kecamatan Airmadidi",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        await update(userRef, { updatedAt: new Date().toISOString() });
      }
      navigate("/products");
    } catch (err) {
      console.error("Google sign-in error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Popup ditutup. Coba lagi.");
      } else if (err.code === "auth/cancelled-popup-request") {
        setError("Permintaan popup dibatalkan. Coba lagi.");
      } else if (err.code === "auth/account-exists-with-different-credential") {
        setError(
          "Akun sudah ada dengan metode sign-in lain. Silakan gunakan metode tersebut."
        );
      } else {
        setError("Gagal login dengan Google. Coba lagi.");
      }
    }
  };

  return (
    <div className="auth-container">
      <h2>Login</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="password-container">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
            style={{ cursor: "pointer" }}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>

        <button type="submit">Login</button>
      </form>

      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          className="google-btn"
          onClick={handleGoogleSignIn}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            width="20"
            height="20"
          />
          Sign in with Google
        </button>
      </div>

      <p style={{ marginTop: 12 }}>
        Belum punya akun? <Link to="/signup">Daftar</Link>
      </p>
    </div>
  );
};

export default Login;
