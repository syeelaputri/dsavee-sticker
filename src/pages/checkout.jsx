// src/pages/Checkout.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
  getDocs, // ← TAMBAHKAN INI
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { useCartState, useCartDispatch } from "../contexts/index";
// SETELAH import yang sudah ada, TAMBAHKAN:
import { jsPDF } from "jspdf";
import "jspdf";

// Color palette dari gambar
const colors = {
  primary: "#0B1957", // Navy blue
  secondary: "#9ECCFA", // Light blue
  background: "#F8F3EA", // Cream background
  accent: "#E6D8C7", // Beige accent
  white: "#FFFFFF",
  textDark: "#1A1A1A",
  textLight: "#666666",
};

export default function Checkout() {
  // State untuk form umum
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // State untuk metode pembayaran
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [wallet, setWallet] = useState("");
  const [selectedBank, setSelectedBank] = useState("BCA");
  const [selectedEwallet, setSelectedEwallet] = useState("GoPay");

  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  // ↓↓↓ STATE BARU UNTUK STRUK PDF ↓↓↓
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [orderData, setOrderData] = useState(null);
  // ↑↑↑ STATE BARU UNTUK STRUK PDF ↑↑↑

  const { items } = useCartState();
  const dispatch = useCartDispatch();

  // ↓↓↓ TAMBAHKAN useEffect UNTUK TEST FIREBASE ↓↓↓
  useEffect(() => {
    console.log("Testing Firebase connection...");

    // Test koneksi Firebase dengan mencoba membaca collection
    const testFirebase = async () => {
      try {
        const testCol = collection(db, "test_connection");
        await getDocs(testCol);
        console.log("✅ Firebase connection: SUCCESS");
      } catch (error) {
        console.error("❌ Firebase connection: FAILED", error);
        console.log("Firebase error details:", error.code, error.message);
      }
    };

    testFirebase();
  }, []);
  // ↑↑↑ TAMBAHKAN useEffect UNTUK TEST FIREBASE ↑↑↑

  // Normalisasi items
  const normalizedItems = (items || []).map((it, idx) => ({
    id: it.id ?? `i-${idx}`,
    name: it.name ?? it.title ?? "Produk",
    price: Number(it.price) || 0,
    qty: Number(it.qty) || 1,
    size: it.size ?? "",
    image: it.image ?? null,
  }));

  const total = normalizedItems.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 1),
    0
  );

  // Validasi berdasarkan metode pembayaran
  const validateForm = () => {
    console.log("🔄 Memvalidasi form...");
    console.log("Nama:", customerName);
    console.log("Alamat:", address);
    console.log("Telepon:", phone);
    console.log("Email:", email);
    console.log("Metode Pembayaran:", paymentMethod);
    console.log("Items:", normalizedItems);

    if (!customerName.trim()) {
      console.log("❌ Validasi gagal: Nama kosong");
      return "Masukkan nama penerima.";
    }
    if (!address.trim()) {
      console.log("❌ Validasi gagal: Alamat kosong");
      return "Masukkan alamat pengiriman.";
    }
    if (!phone.trim()) {
      console.log("❌ Validasi gagal: Telepon kosong");
      return "Masukkan nomor HP.";
    }
    if (!email.trim()) {
      console.log("❌ Validasi gagal: Email kosong");
      return "Masukkan email.";
    }

    // Validasi format email sederhana
    if (!email.includes("@") || !email.includes(".")) {
      console.log("❌ Validasi gagal: Format email tidak valid");
      return "Format email tidak valid.";
    }

    switch (paymentMethod) {
      case "crypto":
        if (!wallet.trim()) {
          console.log("❌ Validasi gagal: Wallet kosong");
          return "Masukkan wallet address.";
        }
        if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
          console.log("❌ Validasi gagal: Format wallet tidak valid");
          return "Wallet address tidak valid (harus mulai 0x dan 40 karakter).";
        }
        break;
      case "cod":
        console.log("✅ Validasi COD berhasil");
        break;
      case "bank":
        console.log("✅ Validasi bank berhasil");
        break;
      case "ewallet":
        console.log("✅ Validasi e-wallet berhasil");
        break;
      default:
        console.log("❌ Validasi gagal: Metode pembayaran tidak dipilih");
        return "Pilih metode pembayaran.";
    }

    if (normalizedItems.length === 0) {
      console.log("❌ Validasi gagal: Keranjang kosong");
      return "Keranjang kosong.";
    }

    console.log("✅ Semua validasi berhasil!");
    return null;
  };

  // Catatan batas waktu berdasarkan metode pembayaran
  const getPaymentDeadline = () => {
    switch (paymentMethod) {
      case "crypto":
        return "⏰ Batas waktu pembayaran: 2 jam";
      case "bank":
        return "⏰ Batas waktu pembayaran: 24 jam";
      case "ewallet":
        return "⏰ Batas waktu pembayaran: 2 jam";
      case "cod":
        return "💰 Bayar ketika barang diterima";
      default:
        return "";
    }
  };

  // Icon untuk metode pembayaran
  const getPaymentIcon = (method) => {
    switch (method) {
      case "cod":
        return "💰";
      case "crypto":
        return "🪙";
      case "bank":
        return "🏦";
      case "ewallet":
        return "📱";
      default:
        return "💳";
    }
  };

  // Fungsi untuk menghasilkan struk PDF (tanpa autoTable)
  const generateReceiptPDF = (order) => {
    try {
      console.log("🔵 Memulai generate PDF dengan data:", order);

      if (!order) {
        console.error("❌ Data order kosong");
        alert("Data order tidak tersedia untuk membuat struk");
        return;
      }

      const doc = new jsPDF();

      // Judul dan header
      doc.setFontSize(20);
      doc.setTextColor(11, 25, 87);
      doc.text("DSAVEE STICKER", 105, 20, null, null, "center");

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("Struk Pembelian", 105, 30, null, null, "center");

      // Garis pemisah
      doc.setDrawColor(158, 204, 250);
      doc.line(20, 35, 190, 35);

      // Informasi order
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`No. Order: ${order.txId || "N/A"}`, 20, 45);
      doc.text(`Tanggal: ${new Date().toLocaleDateString("id-ID")}`, 20, 52);
      doc.text(`Waktu: ${new Date().toLocaleTimeString("id-ID")}`, 20, 59);

      // Informasi customer
      doc.text(`Nama: ${order.customerName || "N/A"}`, 20, 71);
      doc.text(`Telepon: ${order.phone || "N/A"}`, 20, 78);
      doc.text(`Email: ${order.email || "N/A"}`, 20, 85);

      // Alamat
      const addressText = `Alamat: ${order.address || "N/A"}`;
      const addressLines = doc.splitTextToSize(addressText, 170);
      doc.text(addressLines, 20, 92);

      let startY = 92 + addressLines.length * 5;

      // Metode pembayaran
      doc.text(
        `Metode Pembayaran: ${(order.paymentMethod || "N/A").toUpperCase()}`,
        20,
        startY + 10
      );

      // Detail pembayaran berdasarkan metode
      if (order.paymentMethod === "bank") {
        doc.text(`Bank: ${order.bank || "N/A"}`, 20, startY + 17);
        doc.text(
          `No. Rekening: ${order.accountNumber || "N/A"}`,
          20,
          startY + 24
        );
        startY += 14;
      } else if (order.paymentMethod === "ewallet") {
        doc.text(`E-wallet: ${order.ewallet || "N/A"}`, 20, startY + 17);
        doc.text(
          `No. Tujuan: ${order.ewalletNumber || "N/A"}`,
          20,
          startY + 24
        );
        startY += 14;
      } else if (order.paymentMethod === "crypto") {
        doc.text(`Wallet: ${order.wallet || "N/A"}`, 20, startY + 17);
        doc.text(`Blockchain: ${order.blockchain || "N/A"}`, 20, startY + 24);
        doc.text(`Token: ${order.token || "N/A"}`, 20, startY + 31);
        startY += 21;
      }

      // Tabel items (MANUAL - tanpa autoTable)
      const tableRows = order.items || [];
      if (tableRows.length > 0) {
        let tableY = startY + 25;

        // Header tabel
        doc.setFillColor(11, 25, 87); // Warna primary
        doc.setTextColor(255, 255, 255);
        doc.rect(20, tableY, 170, 8, "F");

        doc.text("Produk", 22, tableY + 6);
        doc.text("Size", 85, tableY + 6);
        doc.text("Qty", 110, tableY + 6);
        doc.text("Harga", 125, tableY + 6);
        doc.text("Subtotal", 155, tableY + 6);

        // Isi tabel
        doc.setTextColor(0, 0, 0);
        tableY += 12;

        order.items.forEach((item, index) => {
          if (tableY > 270) {
            doc.addPage();
            tableY = 20;
          }

          doc.text(item.name || "Produk", 22, tableY);
          doc.text(item.size || "-", 85, tableY);
          doc.text(item.qty.toString(), 110, tableY);
          doc.text(`Rp${item.price.toLocaleString("id-ID")}`, 125, tableY);
          doc.text(
            `Rp${(item.price * item.qty).toLocaleString("id-ID")}`,
            155,
            tableY
          );

          // Garis pemisah
          doc.setDrawColor(200, 200, 200);
          doc.line(20, tableY + 3, 190, tableY + 3);

          tableY += 10;
        });

        startY = tableY;
      }

      // Total
      const finalY = startY + 10;
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(
        `TOTAL: Rp${(order.total || 0).toLocaleString("id-ID")}`,
        150,
        finalY
      );

      // Catatan penting
      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      doc.setTextColor(100, 100, 100);

      let notesY = finalY + 15;

      // Catatan 1: Terima kasih
      doc.text(
        "Terima kasih telah berbelanja di DSAVEE STICKER!",
        105,
        notesY,
        null,
        null,
        "center"
      );
      notesY += 8;

      // HAPUS KALIMAT KEDUA (batas waktu pembayaran)

      // Catatan 2: Simpan struk
      doc.text(
        "Simpan struk ini sebagai bukti pembelian.",
        105,
        notesY,
        null,
        null,
        "center"
      );
      notesY += 8;

      // Catatan 3: Hubungi customer service
      doc.text(
        "Untuk pertanyaan, hubungi customer service kami.",
        105,
        notesY,
        null,
        null,
        "center"
      );

      // Simpan PDF
      const fileName = `struk-${order.txId || "unknown"}.pdf`;
      doc.save(fileName);
      console.log("✅ PDF berhasil disimpan:", fileName);
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      alert("Gagal menghasilkan struk PDF: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    console.log("=== CHECKOUT PROCESS STARTED ===");

    const validationError = validateForm();
    if (validationError) {
      console.log("Validation error:", validationError);
      return setMessage(validationError);
    }

    setSubmitting(true);
    setMessage("Menyimpan order...");
    console.log("1. Set submitting to true");

    // TEST TANPA FIREBASE - SIMULASI SAJA
    try {
      console.log("2. Starting simulation...");

      // Buat data order simulasi
      const completeOrderData = {
        customerName,
        address,
        phone,
        email,
        paymentMethod,
        items: normalizedItems,
        total,
        txId: `TEST-${Date.now()}`,
        paymentDeadline: getPaymentDeadline(),
        bank: selectedBank,
        ewallet: selectedEwallet,
        wallet: wallet,
        id: "simulated-order-" + Date.now(),
      };

      console.log("3. Order data created:", completeOrderData);

      // Kosongkan cart
      dispatch({ type: "CLEAR_CART" });
      console.log("4. Cart cleared");

      // SIMPAN DATA ORDER KE STATE
      setOrderData(completeOrderData);
      console.log("5. Order data saved to state");

      // HAPUS GENERATE PDF OTOMATIS DI SINI
      // Pindah ke halaman sukses
      console.log("6. Moving to success page...");
      setSubmitting(false);
      setOrderCompleted(true);
      console.log("7. State updated - DONE!");
    } catch (err) {
      console.error("ERROR in simulation:", err);
      setSubmitting(false);
      setMessage("❌ Error: " + err.message);
    }
  };
  // Render input berdasarkan metode pembayaran
  const renderPaymentInputs = () => {
    switch (paymentMethod) {
      case "crypto":
        return (
          <div
            className="payment-section"
            style={{
              backgroundColor: colors.white,
              padding: "20px",
              borderRadius: "12px",
              border: `2px solid ${colors.secondary}`,
            }}
          >
            <h6 style={{ color: colors.primary, marginBottom: "15px" }}>
              🪙 Crypto Payment
            </h6>
            <div className="mb-3">
              <label
                className="form-label"
                style={{ fontWeight: "600", color: colors.primary }}
              >
                Alamat Wallet
              </label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="0x..."
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                disabled={submitting}
                style={{ borderColor: colors.secondary }}
              />
              <div className="form-text" style={{ color: colors.textLight }}>
                Harus berformat Ethereum address (0x...)
              </div>
            </div>
            <div className="row">
              <div className="col-6">
                <label
                  className="form-label"
                  style={{ fontWeight: "600", color: colors.primary }}
                >
                  Blockchain
                </label>
                <input
                  type="text"
                  className="form-control"
                  value="Ethereum"
                  readOnly
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.secondary,
                  }}
                />
              </div>
              <div className="col-6">
                <label
                  className="form-label"
                  style={{ fontWeight: "600", color: colors.primary }}
                >
                  Token
                </label>
                <input
                  type="text"
                  className="form-control"
                  value="ETH"
                  readOnly
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.secondary,
                  }}
                />
              </div>
            </div>
          </div>
        );

      case "bank":
        return (
          <div
            className="payment-section"
            style={{
              backgroundColor: colors.white,
              padding: "20px",
              borderRadius: "12px",
              border: `2px solid ${colors.secondary}`,
            }}
          >
            <h6 style={{ color: colors.primary, marginBottom: "15px" }}>
              🏦 Bank Transfer
            </h6>
            <div className="mb-3">
              <label
                className="form-label"
                style={{ fontWeight: "600", color: colors.primary }}
              >
                Pilih Bank
              </label>
              <select
                className="form-select"
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                disabled={submitting}
                style={{ borderColor: colors.secondary }}
              >
                <option value="BCA">BCA - Bank Central Asia</option>
                <option value="BNI">BNI - Bank Negara Indonesia</option>
                <option value="BRI">BRI - Bank Rakyat Indonesia</option>
                <option value="Mandiri">Bank Mandiri</option>
              </select>
              <div className="form-text" style={{ color: colors.textLight }}>
                Transfer ke:{" "}
                {process.env.REACT_APP_BANK_ACCOUNT || "123-456-789"} (A/N
                DSAVEE STICKER)
              </div>
            </div>
          </div>
        );

      case "ewallet":
        return (
          <div
            className="payment-section"
            style={{
              backgroundColor: colors.white,
              padding: "20px",
              borderRadius: "12px",
              border: `2px solid ${colors.secondary}`,
            }}
          >
            <h6 style={{ color: colors.primary, marginBottom: "15px" }}>
              📱 E-wallet
            </h6>
            <div className="mb-3">
              <label
                className="form-label"
                style={{ fontWeight: "600", color: colors.primary }}
              >
                Pilih E-wallet
              </label>
              <select
                className="form-select"
                value={selectedEwallet}
                onChange={(e) => setSelectedEwallet(e.target.value)}
                disabled={submitting}
                style={{ borderColor: colors.secondary }}
              >
                <option value="GoPay">GoPay</option>
                <option value="ShopeePay">ShopeePay</option>
                <option value="Dana">Dana</option>
                <option value="OVO">OVO</option>
              </select>
              <div className="form-text" style={{ color: colors.textLight }}>
                Transfer ke:{" "}
                {process.env.REACT_APP_EWALLET_NUMBER || "08123456789"} (DSAVEE
                STICKER)
              </div>
            </div>
          </div>
        );

      case "cod":
        return (
          <div
            className="payment-section"
            style={{
              backgroundColor: colors.white,
              padding: "20px",
              borderRadius: "12px",
              border: `2px solid ${colors.secondary}`,
            }}
          >
            <h6 style={{ color: colors.primary, marginBottom: "15px" }}>
              💰 Cash on Delivery (COD)
            </h6>
            <div
              className="alert"
              style={{
                backgroundColor: colors.accent,
                color: colors.primary,
                border: `1px solid ${colors.secondary}`,
              }}
            >
              <strong>Pembayaran dilakukan ketika barang diterima</strong>
              <br />
              Pastikan Anda akan berada di alamat yang dituju saat pengiriman
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ↓↓↓ TAMBAHKAN KODE INI DI SINI ↓↓↓
  // Tampilan sukses setelah checkout
  if (orderCompleted) {
    return (
      <div
        style={{
          backgroundColor: colors.background,
          minHeight: "100vh",
          padding: "40px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            backgroundColor: colors.white,
            padding: "40px",
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(11, 25, 87, 0.15)",
            maxWidth: "600px",
            width: "100%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "4rem",
              marginBottom: "20px",
            }}
          >
            🎉
          </div>

          <h1
            style={{
              color: colors.primary,
              marginBottom: "20px",
            }}
          >
            Checkout Berhasil!
          </h1>

          <p
            style={{
              color: colors.textLight,
              fontSize: "1.1rem",
              marginBottom: "30px",
            }}
          >
            Terima kasih telah berbelanja di DSAVEE STICKER.
            {orderData && <> Struk Anda tersedia untuk diunduh.</>}
          </p>

          {orderData && (
            <div
              style={{
                backgroundColor: colors.background,
                padding: "20px",
                borderRadius: "12px",
                marginBottom: "30px",
                textAlign: "left",
              }}
            >
              <h5 style={{ color: colors.primary, marginBottom: "15px" }}>
                Detail Order
              </h5>
              <p>
                <strong>No. Order:</strong> {orderData.txId}
              </p>
              <p>
                <strong>Nama:</strong> {orderData.customerName}
              </p>
              <p>
                <strong>Total:</strong> Rp
                {orderData.total.toLocaleString("id-ID")}
              </p>
              <p>
                <strong>Metode Pembayaran:</strong>{" "}
                {orderData.paymentMethod.toUpperCase()}
              </p>
              <p>
                <strong>Status:</strong> {orderData.paymentDeadline}
              </p>
            </div>
          )}

          <div className="d-grid gap-2 d-md-flex justify-content-md-center">
            <button
              className="btn me-md-2"
              onClick={() => {
                console.log("🔄 Mengunduh struk dengan data:", orderData);
                if (orderData) {
                  generateReceiptPDF(orderData);
                } else {
                  alert(
                    "Data order tidak tersedia. Silakan hubungi customer service."
                  );
                }
              }}
              style={{
                backgroundColor: colors.primary,
                color: colors.white,
                border: "none",
                borderRadius: "8px",
                padding: "10px 20px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              📄 Download Struk
            </button>
            <button
              className="btn"
              onClick={() => (window.location.href = "/")}
              style={{
                backgroundColor: colors.secondary,
                color: colors.primary,
                border: "none",
                borderRadius: "8px",
                padding: "10px 20px",
                fontWeight: "600",
              }}
            >
              🏠 Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }
  // ↑↑↑ TAMBAHKAN KODE INI DI SINI ↑↑↑

  return (
    <div
      style={{
        backgroundColor: colors.background,
        minHeight: "100vh",
        padding: "20px 0",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated Bubbles Background */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              bottom: "-100px",
              width: `${Math.random() * 60 + 20}px`,
              height: `${Math.random() * 60 + 20}px`,
              left: `${Math.random() * 100}%`,
              backgroundColor: colors.secondary,
              borderRadius: "50%",
              opacity: 0.1,
              animation: `floatUp ${Math.random() * 20 + 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <style>
        {`
          @keyframes floatUp {
            0% {
              transform: translateY(0) scale(0);
              opacity: 0;
            }
            10% {
              opacity: 0.1;
            }
            90% {
              opacity: 0.1;
            }
            100% {
              transform: translateY(-100vh) scale(1);
              opacity: 0;
            }
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .fade-in {
            animation: fadeIn 0.6s ease-out;
          }

          .pulse-glow {
            animation: pulseGlow 2s infinite;
          }

          @keyframes pulseGlow {
            0% { box-shadow: 0 0 0 0 rgba(11, 25, 87, 0.2); }
            70% { box-shadow: 0 0 0 10px rgba(11, 25, 87, 0); }
            100% { box-shadow: 0 0 0 0 rgba(11, 25, 87, 0); }
          }
        `}
      </style>

      <div
        className="container"
        style={{
          maxWidth: 1000,
          position: "relative",
          zIndex: 2,
        }}
      >
        <div className="row justify-content-center">
          <div className="col-12">
            {/* Header */}
            <div
              className="text-center mb-5 fade-in"
              style={{ paddingTop: "30px" }}
            >
              <h1
                style={{
                  color: colors.primary,
                  fontWeight: "700",
                  fontSize: "2.5rem",
                  marginBottom: "10px",
                }}
              >
                Checkout
              </h1>
              <p style={{ color: colors.textLight, fontSize: "1.1rem" }}>
                Lengkapi informasi pengiriman dan pembayaran
              </p>
            </div>

            <div className="row">
              {/* Form */}
              <div className="col-lg-7">
                <div
                  className="fade-in"
                  style={{
                    backgroundColor: colors.white,
                    padding: "30px",
                    borderRadius: "16px",
                    boxShadow: "0 8px 32px rgba(11, 25, 87, 0.15)",
                    marginBottom: "30px",
                    border: `1px solid ${colors.accent}`,
                  }}
                >
                  <h4
                    style={{
                      color: colors.primary,
                      marginBottom: "25px",
                      borderBottom: `2px solid ${colors.accent}`,
                      paddingBottom: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: colors.primary,
                        color: colors.white,
                        borderRadius: "50%",
                        width: "35px",
                        height: "35px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1rem",
                      }}
                    >
                      📝
                    </span>
                    Informasi Pengiriman
                  </h4>

                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label
                          className="form-label"
                          style={{ fontWeight: "600", color: colors.primary }}
                        >
                          Nama Penerima
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          disabled={submitting}
                          style={{
                            borderColor: colors.secondary,
                            borderRadius: "8px",
                            transition: "all 0.3s ease",
                          }}
                          placeholder="Masukkan nama lengkap"
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label
                          className="form-label"
                          style={{ fontWeight: "600", color: colors.primary }}
                        >
                          Nomor HP
                        </label>
                        <input
                          type="tel"
                          className="form-control"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={submitting}
                          style={{
                            borderColor: colors.secondary,
                            borderRadius: "8px",
                            transition: "all 0.3s ease",
                          }}
                          placeholder="08xxxxxxxxxx"
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label
                        className="form-label"
                        style={{ fontWeight: "600", color: colors.primary }}
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={submitting}
                        style={{
                          borderColor: colors.secondary,
                          borderRadius: "8px",
                          transition: "all 0.3s ease",
                        }}
                        placeholder="email@example.com"
                      />
                    </div>

                    <div className="mb-4">
                      <label
                        className="form-label"
                        style={{ fontWeight: "600", color: colors.primary }}
                      >
                        Alamat Pengiriman
                      </label>
                      <textarea
                        className="form-control"
                        required
                        rows="3"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={submitting}
                        style={{
                          borderColor: colors.secondary,
                          borderRadius: "8px",
                          transition: "all 0.3s ease",
                        }}
                        placeholder="Masukkan alamat lengkap termasuk RT/RW, Kecamatan, Kota"
                      />
                    </div>

                    {/* Metode Pembayaran */}
                    <h4
                      style={{
                        color: colors.primary,
                        marginBottom: "20px",
                        borderBottom: `2px solid ${colors.accent}`,
                        paddingBottom: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          backgroundColor: colors.primary,
                          color: colors.white,
                          borderRadius: "50%",
                          width: "35px",
                          height: "35px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1rem",
                        }}
                      >
                        💳
                      </span>
                      Metode Pembayaran
                    </h4>

                    <div className="mb-4">
                      <label
                        className="form-label"
                        style={{ fontWeight: "600", color: colors.primary }}
                      >
                        Pilih Metode
                      </label>
                      <div className="row g-2">
                        {[
                          {
                            value: "cod",
                            label: "COD",
                            desc: "Bayar di Tempat",
                          },
                          {
                            value: "bank",
                            label: "Bank Transfer",
                            desc: "Transfer Bank",
                          },
                          {
                            value: "ewallet",
                            label: "E-wallet",
                            desc: "Dompet Digital",
                          },
                          {
                            value: "crypto",
                            label: "Crypto",
                            desc: "Pembayaran Crypto",
                          },
                        ].map((method) => (
                          <div key={method.value} className="col-6 mb-2">
                            <div
                              className={`payment-option ${
                                paymentMethod === method.value
                                  ? "active pulse-glow"
                                  : ""
                              }`}
                              onClick={() => setPaymentMethod(method.value)}
                              style={{
                                padding: "15px",
                                border: `2px solid ${
                                  paymentMethod === method.value
                                    ? colors.primary
                                    : colors.secondary
                                }`,
                                borderRadius: "12px",
                                backgroundColor:
                                  paymentMethod === method.value
                                    ? colors.primary
                                    : colors.white,
                                color:
                                  paymentMethod === method.value
                                    ? colors.white
                                    : colors.primary,
                                cursor: "pointer",
                                textAlign: "center",
                                transition: "all 0.3s ease",
                                transform:
                                  paymentMethod === method.value
                                    ? "scale(1.02)"
                                    : "scale(1)",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "1.5rem",
                                  marginBottom: "5px",
                                }}
                              >
                                {getPaymentIcon(method.value)}
                              </div>
                              <div
                                style={{
                                  fontWeight: "600",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {method.label}
                              </div>
                              <div
                                style={{ fontSize: "0.75rem", opacity: 0.8 }}
                              >
                                {method.desc}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Input Spesifik Metode Pembayaran */}
                    {renderPaymentInputs()}

                    {/* Catatan Batas Waktu */}
                    <div
                      className="alert mt-4"
                      style={{
                        backgroundColor: colors.secondary,
                        color: colors.primary,
                        border: `1px solid ${colors.primary}20`,
                        borderRadius: "12px",
                        animation: "pulseGlow 2s infinite",
                      }}
                    >
                      <strong>📋 Informasi Penting:</strong>{" "}
                      {getPaymentDeadline()}
                    </div>

                    {/* Bukti Pembayaran (kecuali COD) */}
                    {paymentMethod !== "cod" && (
                      <div className="mb-4">
                        <label
                          className="form-label"
                          style={{ fontWeight: "600", color: colors.primary }}
                        >
                          Bukti Pembayaran (Opsional)
                        </label>
                        <input
                          type="file"
                          className="form-control"
                          onChange={(e) =>
                            setProofFile(e.target.files[0] || null)
                          }
                          disabled={submitting}
                          style={{
                            borderColor: colors.secondary,
                            borderRadius: "8px",
                            padding: "8px",
                          }}
                        />
                        <small
                          className="form-text"
                          style={{ color: colors.textLight }}
                        >
                          Upload bukti transfer/pembayaran untuk proses
                          verifikasi yang lebih cepat
                        </small>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="d-grid gap-2">
                      <button
                        type="submit"
                        className="btn btn-lg"
                        disabled={submitting}
                        style={{
                          backgroundColor: submitting
                            ? colors.textLight
                            : colors.primary,
                          color: colors.white,
                          border: "none",
                          borderRadius: "12px",
                          padding: "15px",
                          fontWeight: "600",
                          fontSize: "1.1rem",
                          transition: "all 0.3s ease",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        {submitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Memproses Order...
                          </>
                        ) : (
                          <>
                            <span style={{ marginRight: "8px" }}>🛒</span>
                            Konfirmasi Order - Rp{total.toLocaleString("id-ID")}
                          </>
                        )}
                      </button>
                    </div>

                    {message && (
                      <div
                        className={`alert mt-3 ${
                          message.includes("❌")
                            ? "alert-danger"
                            : "alert-success"
                        }`}
                        style={{ borderRadius: "12px" }}
                      >
                        {message}
                      </div>
                    )}
                  </form>
                </div>
              </div>

              {/* Ringkasan Order */}
              <div className="col-lg-5">
                <div
                  className="fade-in"
                  style={{
                    backgroundColor: colors.white,
                    padding: "25px",
                    borderRadius: "16px",
                    boxShadow: "0 8px 32px rgba(11, 25, 87, 0.15)",
                    position: "sticky",
                    top: "20px",
                    border: `1px solid ${colors.accent}`,
                  }}
                >
                  <h4
                    style={{
                      color: colors.primary,
                      marginBottom: "20px",
                      borderBottom: `2px solid ${colors.accent}`,
                      paddingBottom: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: colors.primary,
                        color: colors.white,
                        borderRadius: "50%",
                        width: "35px",
                        height: "35px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1rem",
                      }}
                    >
                      🛍️
                    </span>
                    Ringkasan Pesanan
                  </h4>

                  <div
                    className="order-items"
                    style={{ maxHeight: "400px", overflowY: "auto" }}
                  >
                    {normalizedItems && normalizedItems.length ? (
                      normalizedItems.map((it, idx) => (
                        <div
                          key={it.id || idx}
                          className="d-flex justify-content-between align-items-center py-3 border-bottom"
                          style={{ borderColor: `${colors.accent}50` }}
                        >
                          <div className="d-flex align-items-center">
                            {it.image && (
                              <img
                                src={it.image}
                                alt={it.name}
                                style={{
                                  width: "50px",
                                  height: "50px",
                                  objectFit: "cover",
                                  borderRadius: "8px",
                                  marginRight: "15px",
                                  border: `1px solid ${colors.accent}`,
                                }}
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            )}
                            <div>
                              <div
                                style={{
                                  fontWeight: "600",
                                  color: colors.primary,
                                  fontSize: "0.9rem",
                                }}
                              >
                                {it.name}
                              </div>
                              <small style={{ color: colors.textLight }}>
                                {it.size || "Standard"}
                              </small>
                              <div
                                style={{
                                  color: colors.textLight,
                                  fontSize: "0.8rem",
                                }}
                              >
                                Qty: {it.qty} × Rp
                                {it.price.toLocaleString("id-ID")}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div
                              style={{
                                fontWeight: "700",
                                color: colors.primary,
                              }}
                            >
                              Rp{(it.price * it.qty).toLocaleString("id-ID")}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        className="text-center py-4"
                        style={{ color: colors.textLight }}
                      >
                        <div style={{ fontSize: "3rem", marginBottom: "10px" }}>
                          🛒
                        </div>
                        Keranjang kosong
                      </div>
                    )}
                  </div>

                  <div
                    className="mt-4 pt-3 border-top"
                    style={{ borderColor: `${colors.primary}30` }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div style={{ color: colors.textLight }}>Subtotal</div>
                      <div style={{ color: colors.textDark }}>
                        Rp{total.toLocaleString("id-ID")}
                      </div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div style={{ color: colors.textLight }}>
                        Ongkos Kirim
                      </div>
                      <div style={{ color: "#27ae60", fontWeight: "600" }}>
                        Gratis
                      </div>
                    </div>
                    <div
                      className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top"
                      style={{ borderColor: `${colors.primary}30` }}
                    >
                      <div
                        style={{
                          fontWeight: "700",
                          fontSize: "1.2rem",
                          color: colors.primary,
                        }}
                      >
                        Total
                      </div>
                      <div
                        style={{
                          fontWeight: "800",
                          fontSize: "1.3rem",
                          color: colors.primary,
                        }}
                      >
                        Rp{total.toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
