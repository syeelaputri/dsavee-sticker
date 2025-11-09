// src/pages/profile.jsx
import React, { useEffect, useState, useRef } from "react";
import { getDatabase, ref, get, set, update } from "firebase/database";
import { useNavigate, Link } from "react-router-dom";
import {
  getAuth,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
} from "firebase/auth";

export default function Profile() {
  const navigate = useNavigate();
  const auth = getAuth();

  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const prevAuthRef = useRef(null);

  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
  });

  const sampleHistory = [
    {
      id: "o1",
      items: [{ name: "Flower Sticker Pack" }],
      totalAmount: 55000,
      createdAt: new Date("2024-01-15"),
      status: "delivered",
    },
    {
      id: "o2",
      items: [{ name: "Aesthetic Quote Stickers" }],
      totalAmount: 20000,
      createdAt: new Date("2024-01-10"),
      status: "processing",
    },
    {
      id: "o3",
      items: [
        { name: "Kawaii Food Stickers" },
        { name: "Minimalist Line Art" },
      ],
      totalAmount: 50000,
      createdAt: new Date("2024-01-05"),
      status: "shipped",
    },
  ];

  // =========================================================
  // listen auth changes dan sinkron ke Realtime Database (users/{uid})
  useEffect(() => {
    const db = getDatabase();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setAuthLoading(false);

      try {
        if (prevAuthRef.current && !currentUser) {
          if (
            typeof window !== "undefined" &&
            window.location.pathname === "/profile"
          ) {
            navigate("/");
          }
        }
      } catch (err) {
        console.warn("Error checking logout transition:", err);
      }

      prevAuthRef.current = currentUser;

      if (currentUser) {
        setUser(currentUser);
        setEditForm((prev) => ({
          ...prev,
          name: currentUser.displayName || "Nama Pengguna",
          email: currentUser.email || "user@example.com",
        }));

        try {
          const userRef = ref(db, `users/${currentUser.uid}`);
          const snap = await get(userRef);

          if (!snap.exists()) {
            await set(userRef, {
              uid: currentUser.uid,
              email: currentUser.email || "",
              name: currentUser.displayName || "",
              phone: "",
              address: "",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          } else {
            await update(userRef, { updatedAt: Date.now() });
          }

          const fresh = await get(userRef);
          const userData = fresh.exists() ? fresh.val() : {};
          setEditForm({
            name: userData.name || currentUser.displayName || "",
            email: userData.email || currentUser.email || "",
            phone: userData.phone || "",
            address: userData.address || "",
          });
        } catch (err) {
          console.error("Gagal menyimpan/mengambil data user (RTDB):", err);
        }

        setHistory(sampleHistory);
      } else {
        setUser(null);
        setHistory(sampleHistory);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, navigate]);

  // =========================================================
  // HANDLER FUNCTIONS
  const handleLogin = () => navigate("/login");
  const handleSignup = () => navigate("/signup");

  const handleEditToggle = () => {
    if (!user) {
      alert("Please login to edit your profile");
      return;
    }
    setIsEditing(!isEditing);
  };

  // Sanitize input: if name === 'phone' => keep only digits, max length 15
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      // remove all non-digit characters
      const digits = String(value).replace(/\D/g, "");
      // optional: limit length to 15 (international-ish)
      const limited = digits.slice(0, 15);
      setEditForm((prev) => ({ ...prev, phone: limited }));
    } else {
      setEditForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Prevent paste of non-digit characters into phone field
  const handlePhonePaste = (e) => {
    const paste = (e.clipboardData || window.clipboardData).getData("text");
    const digits = String(paste).replace(/\D/g, "");
    if (digits !== paste) {
      // If paste contains non-digits, replace clipboard content with digits only
      e.preventDefault();
      // insert sanitized digits at cursor position
      const input = e.target;
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const newVal =
        input.value.slice(0, start) +
        digits.slice(0, 15 - input.value.length) +
        input.value.slice(end);
      // update state and set cursor after inserted digits
      setEditForm((prev) => ({ ...prev, phone: newVal.slice(0, 15) }));
      // setTimeout to move cursor (DOM update)
      setTimeout(() => {
        try {
          input.selectionStart = input.selectionEnd = start + digits.length;
        } catch {}
      }, 0);
    }
    // else allow natural paste (digits only)
  };

  const handleSaveProfile = async () => {
    if (!user) {
      alert("Please login to save profile changes");
      return;
    }

    // validate phone: either empty or digits only
    const phone = editForm.phone ? String(editForm.phone).trim() : "";
    if (phone && !/^\d{3,15}$/.test(phone)) {
      // require between 3 and 15 digits if not empty (adjust as needed)
      alert(
        "Nomor telepon harus berupa angka (3-15 digit). Contoh: 081234567890"
      );
      return;
    }

    try {
      if (auth.currentUser) {
        // update displayName if changed
        if (typeof editForm.name === "string") {
          await updateProfile(auth.currentUser, { displayName: editForm.name });
        }
      }

      const db = getDatabase();
      const userRef = ref(db, `users/${user.uid}`);
      await update(userRef, {
        name: editForm.name,
        phone: phone,
        address: editForm.address,
        email: editForm.email,
        updatedAt: Date.now(),
      });

      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile (RTDB):", err);
      alert("Error updating profile. Please try again.");
    }
  };

  const handleChangePassword = async () => {
    if (!user) return alert("Silakan login terlebih dahulu.");

    const provider = user.providerData[0]?.providerId;

    if (provider !== "password") {
      alert(
        "Akun ini menggunakan Google Sign-In. Silakan ubah password melalui akun Google Anda."
      );
      return;
    }

    const newPassword = prompt("Masukkan password baru:");
    if (!newPassword) return;

    try {
      await updatePassword(user, newPassword);
      alert("Password berhasil diubah!");
    } catch (error) {
      console.error("Gagal ubah password:", error);
      if (error.code === "auth/requires-recent-login") {
        alert("Silakan login ulang sebelum mengubah password.");
      } else {
        alert("Terjadi kesalahan. Coba lagi nanti.");
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("id-ID");
  };

  if (authLoading)
    return (
      <div className="container my-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading profile...</p>
      </div>
    );

  // =========================================================
  // UI
  return (
    <div className="container my-5">
      {/* Inline style block for placeholder transparency */}
      <style>{`
        /* make phone placeholder slightly more transparent */
        input[name="phone"]::placeholder {
          color: rgba(0,0,0,0.45);
          opacity: 0.5;
        }
      `}</style>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Profile</h2>
          <p className="text-muted mb-0">
            {user
              ? `Welcome back, ${editForm.name}!`
              : "Demo Profile - Login to access real features"}
          </p>
        </div>
        <div>
          {!user ? (
            <>
              <button className="btn btn-primary me-2" onClick={handleLogin}>
                Login
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={handleSignup}
              >
                Sign Up
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Profile Info */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="card-title mb-0">Personal Information</h5>
            <div>
              {!user && (
                <span className="badge bg-warning me-2">Demo Mode</span>
              )}
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={handleEditToggle}
                disabled={!user && !isEditing}
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </button>
            </div>
          </div>

          {isEditing ? (
            <div className="edit-form">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={editForm.name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={15}
                    className="form-control"
                    name="phone"
                    value={editForm.phone}
                    onChange={handleInputChange}
                    onPaste={handlePhonePaste}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={editForm.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-control"
                    name="address"
                    value={editForm.address}
                    onChange={handleInputChange}
                    rows="3"
                  />
                </div>
              </div>
              <button className="btn btn-success" onClick={handleSaveProfile}>
                Save Changes
              </button>
            </div>
          ) : (
            <div className="row">
              <div className="col-md-6">
                <p>
                  <strong>Name:</strong> {editForm.name}
                </p>
                <p>
                  <strong>Email:</strong> {editForm.email}
                </p>
              </div>
              <div className="col-md-6">
                <p>
                  <strong>Phone:</strong> {editForm.phone}
                </p>
                <p>
                  <strong>Address:</strong> {editForm.address}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order History */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">Order History</h5>
            <Link to="/orders" className="btn btn-outline-primary btn-sm">
              View All Orders
            </Link>
          </div>
          <p className="text-muted mt-2">Manage and track your orders</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row mt-4">
        {/* Change Password */}
        <div className="col-md-4 mb-3">
          <div className="card text-center">
            <div className="card-body">
              <h5 className="card-title">Change Password</h5>
              <p className="card-text">Secure your account</p>
              <button
                className="btn btn-outline-primary"
                onClick={handleChangePassword}
                disabled={
                  !user || user.providerData[0]?.providerId !== "password"
                }
              >
                Change
              </button>
            </div>
          </div>
        </div>

        {/* Order Tracking */}
        <div className="col-md-4 mb-3">
          <div className="card text-center">
            <div className="card-body">
              <h5 className="card-title">Order Tracking</h5>
              <p className="card-text">Track your orders</p>
              <Link to="/orders" className="btn btn-outline-primary">
                Track Orders
              </Link>
            </div>
          </div>
        </div>

        {/* Help Center */}
        <div className="col-md-4 mb-3">
          <div className="card text-center">
            <div className="card-body">
              <h5 className="card-title">Help Center</h5>
              <p className="card-text">Need assistance?</p>
              <Link to="/aboutUs#kontak" className="btn btn-outline-primary">
                Help Center
              </Link>
            </div>
          </div>
        </div>
      </div>

      {!user && (
        <div className="alert alert-info mt-4">
          <strong>Demo Mode:</strong> This is a demonstration of the profile
          page.
          <button
            className="btn btn-sm btn-outline-primary ms-2"
            onClick={handleLogin}
          >
            Login
          </button>
          <button
            className="btn btn-sm btn-outline-success ms-2"
            onClick={handleSignup}
          >
            Sign Up
          </button>
        </div>
      )}
    </div>
  );
}
