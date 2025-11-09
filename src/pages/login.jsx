import React, { useState } from "react";
import { auth, rtdb } from "../firebase";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  sendEmailVerification,
} from "firebase/auth";
import { ref, get, set, update } from "firebase/database";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../css/style.css";

const ensureRTDBUser = async (user) => {
  if (!user || !user.uid) return false;
  const userRef = ref(rtdb, `users/${user.uid}`);
  const snap = await get(userRef);
  if (!snap.exists()) return false;
  // update updatedAt only
  await update(userRef, { updatedAt: new Date().toISOString() }).catch(
    () => {}
  );
  return true;
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setProcessing(true);
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const u = credential.user || auth.currentUser;
      if (!u) throw new Error("User tidak ditemukan.");

      // If email not verified, re-send verification and block login (optional)
      if (u.email && !u.emailVerified) {
        try {
          await sendEmailVerification(u);
        } catch (sendErr) {
          console.warn("Resend verification failed:", sendErr);
        }
        // sign out to prevent partially signed-in state
        try {
          await signOut(auth);
        } catch (_) {}
        setError(
          "Email belum terverifikasi. Link verifikasi telah dikirim ulang. Periksa inbox/spam untuk memverifikasi akun Anda."
        );
        return;
      }

      const ok = await ensureRTDBUser(u);
      if (!ok) {
        try {
          await signOut(auth);
        } catch (_) {}
        setError(
          "Akun belum terdaftar di database. Silakan daftar terlebih dahulu."
        );
        return;
      }
      // arahkan ke homepage setelah login sukses
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Email login error:", err);
      const code = err?.code;
      switch (code) {
        case "auth/user-not-found":
          setError("Akun tidak ditemukan. Silakan daftar.");
          break;
        case "auth/wrong-password":
          setError("Email atau password salah.");
          break;
        case "auth/invalid-email":
          setError("Format email tidak valid.");
          break;
        case "auth/too-many-requests":
          setError("Terlalu banyak percobaan login. Coba lagi nanti.");
          break;
        case "auth/network-request-failed":
          setError("Koneksi bermasalah. Periksa jaringan Anda.");
          break;
        default:
          setError(
            err?.message || "Gagal login. Periksa koneksi dan coba lagi."
          );
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setInfo("");
    setProcessing(true);
    const provider = new GoogleAuthProvider();
    try {
      const res = await signInWithPopup(auth, provider);
      const u = res.user;
      const userRef = ref(rtdb, `users/${u.uid}`);
      const snap = await get(userRef);
      if (!snap.exists()) {
        // create profile only (no merge)
        const payload = {
          uid: u.uid,
          email: u.email || "",
          name: u.displayName || (u.email ? u.email.split("@")[0] : ""),
          phone: "",
          address: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await set(userRef, payload);
        // NOTE: do NOT merge guest cart here (this is login page)
      } else {
        await update(userRef, { updatedAt: new Date().toISOString() });
      }
      // arahkan ke homepage
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Google sign-in error:", err);
      if (err.code === "auth/popup-closed-by-user")
        setError("Popup ditutup. Coba lagi.");
      else if (err.code === "auth/cancelled-popup-request")
        setError("Permintaan popup dibatalkan.");
      else if (err.code === "auth/account-exists-with-different-credential")
        setError("Akun sudah ada dengan metode sign-in lain.");
      else setError("Gagal login dengan Google. Coba lagi.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Login</h2>
      {error && <p className="error">{error}</p>}
      {info && <p className="info">{info}</p>}
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={processing}
        />
        <div className="password-container">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={processing}
          />
          <span
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
            style={{ cursor: "pointer" }}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>
        <button type="submit" disabled={processing}>
          {processing ? "Memproses..." : "Login"}
        </button>
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
            justifyContent: "center",
          }}
          disabled={processing}
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
