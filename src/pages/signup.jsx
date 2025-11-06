import React, { useState } from "react";
import { auth, rtdb } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  signOut,
} from "firebase/auth";
import { ref, get, set, update } from "firebase/database";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../css/style.css";

const SignUp = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const validatePassword = (password) => {
    if (password.length < 8) return "Password minimal 8 karakter.";
    if (!/[A-Z]/.test(password)) return "Harus mengandung huruf besar.";
    if (!/[a-z]/.test(password)) return "Harus mengandung huruf kecil.";
    if (!/[0-9]/.test(password)) return "Harus mengandung angka.";
    return null;
  };

  const writeUserToRTDB = async (user, extra = {}) => {
    const userRef = ref(rtdb, `users/${user.uid}`);
    const defaultName =
      user.displayName ||
      (user.email ? user.email.split("@")[0] : "Nama Pengguna");
    const payload = {
      uid: user.uid,
      email: user.email || "",
      name: extra.name || defaultName,
      phone: extra.phone || "+62 812 3456 7890",
      address:
        extra.address || "Jl. Contoh Alamat No. 123, Kecamatan Airmadidi",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // set akan membuat/overwrite; ini bagus untuk initial create
    await set(userRef, payload);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const { email, password, confirmPassword } = formData;

    const validationError = validatePassword(password);
    if (validationError) return setError(validationError);
    if (password !== confirmPassword) return setError("Password tidak cocok.");

    try {
      // create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // optional: set displayName in Auth (here using email localpart)
      const defaultName = user.email
        ? user.email.split("@")[0]
        : "Nama Pengguna";
      try {
        await updateProfile(user, { displayName: defaultName });
      } catch (e) {
        console.warn(e);
      }

      // write user record in Realtime Database
      await writeUserToRTDB(user, { name: defaultName });

      // redirect to profile (or wherever)
      navigate("/profile");
    } catch (err) {
      console.error("Sign up error:", err);
      // jika ada user authenticated tapi DB gagal, sign out to avoid partial state
      try {
        await signOut(auth);
      } catch (_) {}
      setError(err.message || "Gagal sign up. Coba lagi.");
    }
  };

  // Google sign-in -> create or update DB record, then navigate
  const handleGoogleSignIn = async () => {
    setError("");
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      // tulis / merge data user di DB
      await writeUserToRTDB(user);
      navigate("/profile");
    } catch (err) {
      console.error("Google sign-in error:", err);
      setError(err.message || "Gagal login dengan Google.");
    }
  };

  return (
    <div className="auth-container">
      <h2>Sign Up</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
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
          />
          <span
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
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
          />
          <span
            className="toggle-password"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>

        <button type="submit">Daftar</button>
      </form>

      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="google-btn"
          style={{ cursor: "pointer" }}
        >
          Masuk dengan Google
        </button>
      </div>

      <p style={{ marginTop: 12 }}>
        Sudah punya akun? <Link to="/login">Login</Link>
      </p>
    </div>
  );
};

export default SignUp;
