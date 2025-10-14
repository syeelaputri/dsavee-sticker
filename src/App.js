import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/header";
import Footer from "./components/footer";
import Home from "./pages/home";
import CartPage from "./pages/cartPage";
import Checkout from "./pages/checkout";
import Profile from "./pages/profile";

export default function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/profile" element={<Profile />} />
        {/* tambah route signup/login jika diperlukan */}
      </Routes>
      <Footer />
    </Router>
  );
}
