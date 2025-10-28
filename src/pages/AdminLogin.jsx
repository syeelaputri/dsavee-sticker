// src/AdminLogin.jsx
import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase"; // karena sejajar
import { useNavigate } from "react-router-dom";
import "../css/style.css"; // juga sejajar
import { FaEye, FaEyeSlash } from "react-icons/fa"; // ikon mata

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const ADMIN_EMAIL = "admin@dsavee.com"; // ubah sesuai kebutuhan

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      if (email !== ADMIN_EMAIL)
        return setError("Hanya admin yang dapat login di halaman ini.");

      await signInWithEmailAndPassword(auth, email, password);
      navigate("/admin/dashboard");
    } catch (err) {
      setError("Login admin gagal. Periksa email dan password Anda.");
    }
  };

  return (
    <div className="auth-container">
      <h2>Admin Login</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Admin Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="password-container">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>

        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default AdminLogin;
