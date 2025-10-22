// src/App.js
import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/header";
import Footer from "./components/footer";
import Home from "./pages/home";
import CartPage from "./pages/cartPage";
import Checkout from "./pages/checkout";
import Profile from "./pages/profile";

// lazy load admin dashboard
const AdminDashboard = lazy(() => import("./pages/dashboardAdmin"));

export default function App() {
  return (
    <Router>
      <Header />
      <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/profile" element={<Profile />} />

          {/* Route untuk dashboard admin — hanya bisa diakses lewat URL /dashboardAdmin */}
          <Route path="/dashboardAdmin" element={<AdminDashboard />} />

          {/* tambah route signup/login jika diperlukan */}
        </Routes>
      </Suspense>
      <Footer />
    </Router>
  );
}
