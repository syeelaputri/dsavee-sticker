// src/pages/login.jsx
import React, { useState } from "react";
import { auth, rtdb } from "../firebase";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { ref, get, set, update } from "firebase/database";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../css/style.css";

const ADMIN_EMAIL = "dsaveesticker@gmail.com";

const ensureRTDBUser = async (user) => {
  if (!user || !user.uid) return false;
  const userRef = ref(rtdb, `users/${user.uid}`);
  const snap = await get(userRef);
  if (!snap.exists()) return false;
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
  const [showForgot, setShowForgot] = useState(false);
  const navigate = useNavigate();

  const goAfterLogin = (user) => {
    // pastikan email ada, bandingkan lowercase
    const userEmail = (user?.email || "").toLowerCase();
    if (userEmail === ADMIN_EMAIL.toLowerCase()) {
      // langsung buka dashboard admin
      navigate("/dashboardAdmin", { replace: true });
      return true;
    }
    // non-admin: buka homepage
    navigate("/", { replace: true });
    return false;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setShowForgot(false);
    setProcessing(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const u = credential.user || auth.currentUser;
      if (!u) throw new Error("User tidak ditemukan.");

      // Jika admin, langsung redirect ke dashboardAdmin tanpa harus cek RTDB
      if (u.email && u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        // (Opsional) update RTDB timestamp if exists, but don't block admin login
        try {
          const userRef = ref(rtdb, `users/${u.uid}`);
          const snap = await get(userRef);
          if (snap.exists()) {
            await update(userRef, { updatedAt: new Date().toISOString() });
          } else {
            // jika belum ada di RTDB, buat profil singkat agar data admin konsisten
            await set(userRef, {
              uid: u.uid,
              email: u.email || "",
              name: u.displayName || "",
              phone: "",
              address: "",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (dbErr) {
          console.warn("Gagal update/create admin record di RTDB:", dbErr);
        }

        // arahkan ke halaman admin
        navigate("/dashboardAdmin", { replace: true });
        return;
      }

      // Jika email belum terverifikasi, kirim ulang verifikasi dan blok login
      if (u.email && !u.emailVerified) {
        try {
          await sendEmailVerification(u);
        } catch (_) {}
        try {
          await signOut(auth);
        } catch (_) {}
        setError(
          "Email belum terverifikasi. Link verifikasi telah dikirim ulang."
        );
        return;
      }

      // Pastikan user juga ada di RTDB (profil)
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

      // normal user -> homepage
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Email login error:", err);
      const code = err?.code;

      switch (code) {
        case "auth/user-not-found":
          setError("Akun tidak ditemukan. Periksa kembali email Anda.");
          break;

        case "auth/wrong-password":
        case "auth/invalid-credential":
          setError("Email atau password salah. Coba lagi.");
          setShowForgot(true);
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
          // fallback message, tetap tampilkan forgot bila email diisi (kecuali invalid-email)
          setError("Gagal login. Coba lagi nanti.");
          if (email.trim() && !(code || "").includes("invalid-email")) {
            setShowForgot(true);
          }
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Masukkan email Anda terlebih dahulu.");
      return;
    }

    setError("");
    setInfo("Mengirim email reset password...");
    setProcessing(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo(
        "Email reset password telah dikirim. Periksa inbox atau folder spam Anda."
      );
      setShowForgot(false);
    } catch (err) {
      console.error("Reset password error:", err);
      if (err?.code === "auth/user-not-found") {
        setError("Email tidak terdaftar.");
      } else if (err?.code === "auth/invalid-email") {
        setError("Format email tidak valid.");
      } else {
        setError("Gagal mengirim email reset password. Coba lagi nanti.");
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
      if (!u) throw new Error("User tidak ditemukan.");

      // Jika admin (Google sign-in), langsung ke dashboard admin
      if (u.email && u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        try {
          const userRef = ref(rtdb, `users/${u.uid}`);
          const snap = await get(userRef);
          if (!snap.exists()) {
            await set(userRef, {
              uid: u.uid,
              email: u.email || "",
              name: u.displayName || (u.email ? u.email.split("@")[0] : ""),
              phone: "",
              address: "",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } else {
            await update(userRef, { updatedAt: new Date().toISOString() });
          }
        } catch (dbErr) {
          console.warn("Gagal update/create admin record di RTDB:", dbErr);
        }
        navigate("/dashboardAdmin", { replace: true });
        return;
      }

      // bukan admin: buat/upgrade profil di RTDB lalu ke homepage
      const userRef = ref(rtdb, `users/${u.uid}`);
      const snap = await get(userRef);

      if (!snap.exists()) {
        await set(userRef, {
          uid: u.uid,
          email: u.email || "",
          name: u.displayName || (u.email ? u.email.split("@")[0] : ""),
          phone: "",
          address: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        await update(userRef, { updatedAt: new Date().toISOString() });
      }

      navigate("/", { replace: true });
    } catch (err) {
      console.error("Google sign-in error:", err);
      if (err?.code === "auth/popup-closed-by-user")
        setError("Popup ditutup. Coba lagi.");
      else if (err?.code === "auth/cancelled-popup-request")
        setError("Permintaan popup dibatalkan.");
      else if (err?.code === "auth/account-exists-with-different-credential")
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

      <form onSubmit={handleLogin} style={{ textAlign: "center" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
            setInfo("");
            setShowForgot(false);
          }}
          required
          disabled={processing}
        />

        <div className="password-container" style={{ marginBottom: "10px" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
              setInfo("");
              setShowForgot(false);
            }}
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

        {/* Tombol Forgot Password di tengah */}
        {showForgot && (
          <div
            style={{
              textAlign: "center",
              marginBottom: "15px",
            }}
          >
            <button
              onClick={handleForgotPassword}
              type="button"
              style={{
                color: "#007bff",
                background: "none",
                border: "none",
                textDecoration: "underline",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Forgot Password?
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={processing}
          style={{ width: "100%", marginTop: "5px" }}
        >
          {processing ? "Loading..." : "Login"}
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
          Login with Google
        </button>
      </div>

      <p style={{ marginTop: 12 }}>
        Belum punya akun? <Link to="/signup">Sign Up</Link>
      </p>
    </div>
  );
};

export default Login;
