import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  updateDoc,
  addDoc,
  doc,
} from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { getAuth, onAuthStateChanged, updateProfile } from "firebase/auth";

export default function Profile() {
  const navigate = useNavigate();
  const auth = getAuth();

  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "Nama Pengguna",
    phone: "+62 812 3456 7890",
    address: "Jl. Contoh Alamat No. 123, Kecamatan Airmadidi",
    email: "user@example.com",
  });

  // Sample data untuk demo (tanpa perlu login)
  const sampleHistory = [
    {
      id: "o1",
      items: [{ name: "Flower Sticker Pack" }, { name: "Character Stickers" }],
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

  // Real-time user authentication (optional - tidak mandatory)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setAuthLoading(false);

      if (currentUser) {
        setUser(currentUser);
        setEditForm((prev) => ({
          ...prev,
          name: currentUser.displayName || "Nama Pengguna",
          email: currentUser.email || "user@example.com",
        }));
        // Jika user login, fetch data real
        fetchUserData(currentUser.uid);
      } else {
        setUser(null);
        // Tetap tampilkan UI dengan sample data
        setHistory(sampleHistory);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, navigate]);

  // Fetch user profile data from Firestore (jika login)
  const fetchUserData = async (userId) => {
    try {
      const userDoc = await getDocs(
        query(collection(db, "users"), where("uid", "==", userId))
      );
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        setEditForm((prev) => ({
          ...prev,
          name: userData.name || "Nama Pengguna",
          phone: userData.phone || "+62 812 3456 7890",
          address:
            userData.address ||
            "Jl. Contoh Alamat No. 123, Kecamatan Airmadidi",
          email: userData.email || "user@example.com",
        }));
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setLoading(false);
    }
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleSignup = () => {
    navigate("/signup");
  };

  const handleLogout = () => {
    if (user) {
      auth.signOut();
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
    // Reset ke sample data setelah logout
    setEditForm({
      name: "Nama Pengguna",
      phone: "+62 812 3456 7890",
      address: "Jl. Contoh Alamat No. 123, Kecamatan Airmadidi",
      email: "user@example.com",
    });
    setHistory(sampleHistory);
  };

  const handleEditToggle = () => {
    if (!user) {
      alert("Please login to edit your profile");
      return;
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    if (!user) {
      alert("Please login to save profile changes");
      return;
    }

    try {
      // Update in Firebase Auth (displayName)
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: editForm.name,
        });
      }

      // Update in Firestore
      const userRef = collection(db, "users");
      const userQuery = query(userRef, where("uid", "==", user.uid));
      const userDoc = await getDocs(userQuery);

      if (!userDoc.empty) {
        // Update existing user document
        const docId = userDoc.docs[0].id;
        await updateDoc(doc(db, "users", docId), {
          name: editForm.name,
          phone: editForm.phone,
          address: editForm.address,
          email: editForm.email,
          updatedAt: new Date(),
        });
      } else {
        // Create new user document
        await addDoc(collection(db, "users"), {
          uid: user.uid,
          email: editForm.email,
          name: editForm.name,
          phone: editForm.phone,
          address: editForm.address,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile. Please try again.");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("id-ID");
  };

  // Tampilkan loading selama auth check
  if (authLoading) {
    return (
      <div className="container my-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container my-5">
      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Profile</h2>
          {user ? (
            <p className="text-muted mb-0">Welcome back, {editForm.name}!</p>
          ) : (
            <p className="text-muted mb-0">
              Demo Profile - Login to access real features
            </p>
          )}
        </div>
        <div>
          {user ? (
            <button className="btn btn-danger" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <div>
              <button className="btn btn-primary me-2" onClick={handleLogin}>
                Login
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={handleSignup}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Information */}
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
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={editForm.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
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
                    placeholder="Enter your email"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    name="phone"
                    value={editForm.phone}
                    onChange={handleInputChange}
                    placeholder="+62 XXX XXXX XXXX"
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
                    placeholder="Enter your complete address"
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

      {/* Order History Section */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">Riwayat Pesanan</h5>
            <Link to="/orders" className="btn btn-outline-primary btn-sm">
              Lihat Semua Pesanan
            </Link>
          </div>
          <p className="text-muted mt-2">Kelola dan lacak pesanan Anda</p>
        </div>
      </div>

      {/* Recent Orders Preview */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="card-title mb-0">Pesanan Terbaru</h5>
            {!user && <span className="badge bg-info">Sample Data</span>}
          </div>

          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading order history...</p>
            </div>
          ) : history.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead className="table-dark">
                  <tr>
                    <th>Order ID</th>
                    <th>Products</th>
                    <th>Total Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 3).map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id?.slice(-6) || order.id}</td>
                      <td>
                        {order.items?.map((item) => item.name).join(", ") ||
                          "N/A"}
                      </td>
                      <td>Rp {order.totalAmount?.toLocaleString() || "0"}</td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>
                        <span
                          className={`badge ${
                            order.status === "delivered"
                              ? "bg-success"
                              : order.status === "processing"
                              ? "bg-warning"
                              : order.status === "shipped"
                              ? "bg-info"
                              : order.status === "cancelled"
                              ? "bg-danger"
                              : "bg-secondary"
                          }`}
                        >
                          {order.status || "Unknown"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {history.length > 3 && (
                <div className="text-center mt-3">
                  <Link to="/orders" className="btn btn-outline-primary">
                    Lihat {history.length - 3} Pesanan Lainnya
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted">No purchase history found.</p>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/products")}
              >
                Start Shopping
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row mt-4">
        <div className="col-md-4 mb-3">
          <div className="card text-center">
            <div className="card-body">
              <h5 className="card-title">Change Password</h5>
              <p className="card-text">Secure your account</p>
              <button
                className="btn btn-outline-primary"
                onClick={handleLogin}
                disabled={!user}
              >
                {user ? "Change" : "Login to Change"}
              </button>
            </div>
          </div>
        </div>
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
        <div className="col-md-4 mb-3">
          <div className="card text-center">
            <div className="card-body">
              <h5 className="card-title">Help Center</h5>
              <p className="card-text">Need assistance?</p>
              <button className="btn btn-outline-primary">Contact Us</button>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Notice */}
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
          to access real features and save your data.
        </div>
      )}
    </div>
  );
}
