import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";

import Header from "./components/header";
import Footer from "./components/footer";
import Home from "./pages/home";
import CartPage from "./pages/cartPage";
import Checkout from "./pages/checkout";
import Profile from "./pages/profile";
import Login from "./pages/login";
import SignUp from "./pages/signup";
import AdminLogin from "./pages/AdminLogin";
import Logout from "./pages/logout";
import Products from "./pages/products";
import OrderHistory from "./pages/orderHistory";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/products" element={<Products />} />
            <Route path="/orders" element={<OrderHistory />} />
          </Routes>
          <Footer />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}
