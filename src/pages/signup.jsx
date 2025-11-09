import React, { useState } from "react";
import { auth, rtdb } from "../firebase";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  signOut,
  sendEmailVerification,
} from "firebase/auth";
import { ref, set, get, update } from "firebase/database";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../css/style.css";

const GUEST_KEY = "guest_cart_v1";

const makeProfilePayload = (user, extra = {}) => {
  const name =
    extra.name ??
    user.displayName ??
    (user.email ? user.email.split("@")[0] : "");
  return {
    uid: user.uid,
    email: user.email || "",
    name,
    phone: extra.phone || "",
    address: extra.address || "",
    createdAt: extra.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

// helper read guest
const readGuest = () => {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// helper merge arrays by id+variant (sum qty)
const mergeCarts = (base = [], incoming = []) => {
  const map = new Map();
  const add = (arr) =>
    arr.forEach((it) => {
      const key = `${it.id}::${it.variant ?? ""}`;
      const existing = map.get(key);
      if (existing) {
        map.set(key, { ...existing, qty: (existing.qty || 0) + (it.qty || 0) });
      } else {
        map.set(key, { ...it });
      }
    });
  add(base);
  add(incoming);
  return Array.from(map.values());
};

const SignUp = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(""); // non-error messages
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  const validatePassword = (password) => {
    if (password.length < 8) return "Password minimal 8 karakter.";
    if (!/[A-Z]/.test(password)) return "Harus mengandung huruf besar.";
    if (!/[a-z]/.test(password)) return "Harus mengandung huruf kecil.";
    if (!/[0-9]/.test(password)) return "Harus mengandung angka.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    const { email, password, confirmPassword } = formData;
    const vErr = validatePassword(password);
    if (vErr) return setError(vErr);
    if (password !== confirmPassword) return setError("Password tidak cocok.");
    setProcessing(true);
    try {
      // create account with email/password
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const u = cred.user;

      // set displayName default (email prefix) if no displayName
      const defaultName = u.email ? u.email.split("@")[0] : "";
      try {
        await updateProfile(u, { displayName: defaultName });
      } catch (e) {
        // ignore profile update errors
        console.warn("updateProfile failed:", e);
      }

      // write profile to Realtime DB
      const payload = makeProfilePayload(u, { name: defaultName });
      const userRef = ref(rtdb, `users/${u.uid}`);
      await set(userRef, payload);

      // try to send verification email (best-effort)
      try {
        await sendEmailVerification(u);
        setInfo(
          "Email verifikasi telah dikirim. Periksa inbox/spam untuk memverifikasi akun Anda."
        );
      } catch (verErr) {
        console.warn("sendEmailVerification failed:", verErr);
        // non-fatal: keep going
      }

      // --- MERGE guest cart INTO user's cart (karena ini signup) ---
      try {
        const guestCart = readGuest(); // array
        const userCartRef = ref(rtdb, `users/${u.uid}/cart`);
        const snap = await get(userCartRef);
        let serverCart = [];
        if (snap.exists()) {
          const val = snap.val();
          if (Array.isArray(val)) serverCart = val;
          else if (val && typeof val === "object")
            serverCart = Object.values(val);
        }
        const merged = mergeCarts(serverCart, guestCart);
        await set(userCartRef, merged);
        // hapus guest local supaya merge tidak terjadi lagi
        localStorage.removeItem(GUEST_KEY);
      } catch (mergeErr) {
        console.error("Merge cart during signup failed:", mergeErr);
        // merge gagal tidak menghalangi signup - tetap lanjut
      }

      // arahkan ke homepage setelah berhasil signup
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Sign up error:", err);
      // pastikan logout jika ada partial auth
      try {
        await signOut(auth);
      } catch (_) {}
      // lebih spesifikkan pesan error bila memungkinkan
      if (err && err.code) {
        switch (err.code) {
          case "auth/email-already-in-use":
            setError(
              "Email sudah digunakan. Silakan login atau gunakan email lain."
            );
            break;
          case "auth/invalid-email":
            setError("Format email tidak valid.");
            break;
          case "auth/weak-password":
            setError(
              "Password terlalu lemah. Gunakan kombinasi huruf & angka minimal 8 karakter."
            );
            break;
          case "auth/operation-not-allowed":
            setError("Pendaftaran tidak diizinkan. Hubungi admin.");
            break;
          case "auth/too-many-requests":
            setError("Terlalu banyak percobaan. Coba lagi nanti.");
            break;
          default:
            setError(err?.message || "Gagal sign up. Coba lagi.");
        }
      } else {
        setError(err?.message || "Gagal sign up. Coba lagi.");
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
        const payload = makeProfilePayload(u);
        await set(userRef, payload);
        // MERGE guest cart karena ini signup via Google (akun baru)
        try {
          const guestCart = readGuest();
          const userCartRef = ref(rtdb, `users/${u.uid}/cart`);
          const merged = mergeCarts([], guestCart);
          await set(userCartRef, merged);
          localStorage.removeItem(GUEST_KEY);
        } catch (mergeErr) {
          console.error("Merge cart after Google signup failed:", mergeErr);
        }
      } else {
        // existing user: update timestamp only (no merge)
        try {
          await update(userRef, { updatedAt: new Date().toISOString() });
        } catch (e) {
          // fallback: set whole object with updatedAt (very unlikely)
          await set(userRef, {
            ...(snap.val() || {}),
            updatedAt: new Date().toISOString(),
          });
        }
      }
      // arahkan ke homepage
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Google signup error:", err);
      // mapping error codes
      if (err && err.code) {
        if (err.code === "auth/popup-closed-by-user")
          setError("Popup ditutup. Coba lagi.");
        else if (err.code === "auth/cancelled-popup-request")
          setError("Permintaan popup dibatalkan.");
        else if (err.code === "auth/account-exists-with-different-credential")
          setError("Akun sudah ada dengan metode sign-in lain.");
        else if (err.code === "auth/popup-blocked")
          setError("Popup diblokir oleh browser.");
        else setError(err?.message || "Gagal login dengan Google. Coba lagi.");
      } else {
        setError(err?.message || "Gagal login dengan Google. Coba lagi.");
      }
      // pastikan sign out jika state auth tidak bersih
      try {
        await signOut(auth);
      } catch (_) {}
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Sign Up</h2>
      {error && <p className="error">{error}</p>}
      {info && <p className="info">{info}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          disabled={processing}
        />
        <div className="password-container">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
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
        <div className="password-container">
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
            required
            disabled={processing}
          />
          <span
            className="toggle-password"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            style={{ cursor: "pointer" }}
          >
            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>
        <button type="submit" disabled={processing}>
          {processing ? "Loading..." : "Sign Up"}
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
          Sign up with Google
        </button>
      </div>

      <p style={{ marginTop: 12 }}>
        Sudah punya akun? <Link to="/login">Login</Link>
      </p>
    </div>
  );
};

export default SignUp;
