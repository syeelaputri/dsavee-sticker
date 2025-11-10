import React, { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";

import Header from "./components/header";
import Footer from "./components/footer";
import Home from "./pages/home";
import Checkout from "./pages/checkout";
import Profile from "./pages/profile";
import AdminDashboard from "./pages/dashboardAdmin";
import AboutUs from "./pages/aboutUs";
import Login from "./pages/login";
import SignUp from "./pages/signup";
import OrderHistory from "./pages/orderHistory";
import ProductDetail from "./pages/productDetail";
import ChatSupport from "./components/chatSupport"; // <- import

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Header />
          <Suspense
            fallback={<div className="p-6 text-center">Loading...</div>}
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/product/:productId" element={<ProductDetail />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/dashboardAdmin" element={<AdminDashboard />} />
              <Route path="/aboutUs" element={<AboutUs />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/login" element={<Login />} />
              <Route path="/orders" element={<OrderHistory />} />
            </Routes>
          </Suspense>
          <Footer />

          {/* Chat support aktif di semua halaman */}
          <ChatSupport />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}
