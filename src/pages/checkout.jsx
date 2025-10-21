// src/pages/Checkout.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { useCartState, useCartDispatch } from "../contexts/index";

// Color palette dari gambar
const colors = {
  primary: "#0B1957",     // Navy blue
  secondary: "#9ECCFA",   // Light blue
  background: "#F8F3EA",  // Cream background
  accent: "#E6D8C7",      // Beige accent
  white: "#FFFFFF",
  textDark: "#1A1A1A",
  textLight: "#666666"
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

  const { items } = useCartState();
  const dispatch = useCartDispatch();

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
    if (!customerName) return "Masukkan nama penerima.";
    if (!address) return "Masukkan alamat pengiriman.";
    if (!phone) return "Masukkan nomor HP.";
    if (!email) return "Masukkan email.";
    
    switch (paymentMethod) {
      case "crypto":
        if (!wallet) return "Masukkan wallet address.";
        if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
          return "Wallet address tidak valid (harus mulai 0x).";
        }
        break;
      case "cod":
        // Tidak perlu validasi tambahan untuk COD
        break;
      case "bank":
        // Bank sudah dipilih dari dropdown
        break;
      case "ewallet":
        // E-wallet sudah dipilih dari dropdown
        break;
      default:
        return "Pilih metode pembayaran.";
    }
    
    if (normalizedItems.length === 0) return "Keranjang kosong.";
    
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
      case "cod": return "💰";
      case "crypto": return "🪙";
      case "bank": return "🏦";
      case "ewallet": return "📱";
      default: return "💳";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    
    const validationError = validateForm();
    if (validationError) {
      return setMessage(validationError);
    }

    setSubmitting(true);
    setMessage("Menyimpan order...");

    try {
      const ordersCol = collection(db, "orders");
      
      // Data dasar order
      const orderData = {
        customerName,
        address,
        phone,
        email,
        paymentMethod,
        items: normalizedItems,
        total,
        status: paymentMethod === "cod" ? "pending_payment" : "pending",
        proofName: proofFile ? proofFile.name : null,
        proofUrl: null,
        createdAt: serverTimestamp(),
        paymentDeadline: getPaymentDeadline(),
      };

      // Tambahkan data spesifik berdasarkan metode pembayaran
      switch (paymentMethod) {
        case "crypto":
          orderData.wallet = wallet;
          orderData.blockchain = "Ethereum";
          orderData.token = "ETH";
          orderData.recipient = process.env.REACT_APP_RECEIVER_WALLET || "0xFallback...";
          break;
        case "bank":
          orderData.bank = selectedBank;
          orderData.accountNumber = process.env.REACT_APP_BANK_ACCOUNT || "123-456-789";
          break;
        case "ewallet":
          orderData.ewallet = selectedEwallet;
          orderData.ewalletNumber = process.env.REACT_APP_EWALLET_NUMBER || "08123456789";
          break;
        case "cod":
          orderData.cod = true;
          orderData.paymentStatus = "pending";
          break;
      }

      const orderRef = await addDoc(ordersCol, orderData);

      // Upload proof jika ada (kecuali COD)
      let uploadedProofUrl = null;
      if (proofFile && paymentMethod !== "cod") {
        try {
          const storage = getStorage();
          const sRef = storageRef(
            storage,
            `orderProofs/${orderRef.id}/${proofFile.name}`
          );
          await uploadBytes(sRef, proofFile);
          uploadedProofUrl = await getDownloadURL(sRef);

          await updateDoc(orderRef, {
            proofUrl: uploadedProofUrl,
          });
        } catch (err) {
          console.warn("Upload proof failed:", err);
        }
      }

      // Generate transaction ID
      const txId = `${paymentMethod.toUpperCase()}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      await updateDoc(orderRef, { txId });

      // Kosongkan cart
      dispatch({ type: "CLEAR_CART" });

      setMessage(`✅ Order berhasil disimpan! ${getPaymentDeadline()}`);
      setSubmitting(false);
      
      alert(`🎉 Checkout sukses!\nOrder ID: ${orderRef.id}\n${getPaymentDeadline()}`);

      // Simulasi konfirmasi otomatis (kecuali COD)
      if (paymentMethod !== "cod") {
        setTimeout(async () => {
          try {
            await updateDoc(orderRef, {
              status: "confirmed",
              confirmedAt: serverTimestamp(),
            });
            console.info("Order confirmed:", orderRef.id);
          } catch (err) {
            console.error("Failed to mark confirmed:", err);
          }
        }, 10000);
      }

    } catch (err) {
      console.error("Checkout error:", err);
      alert("❌ Gagal checkout: " + (err.message || err));
      setSubmitting(false);
      setMessage("❌ Gagal menyimpan order.");
    }
  };

  // Render input berdasarkan metode pembayaran
  const renderPaymentInputs = () => {
    switch (paymentMethod) {
      case "crypto":
        return (
          <div className="payment-section" style={{ 
            backgroundColor: colors.white, 
            padding: '20px', 
            borderRadius: '12px',
            border: `2px solid ${colors.secondary}`
          }}>
            <h6 style={{ color: colors.primary, marginBottom: '15px' }}>🪙 Crypto Payment</h6>
            <div className="mb-3">
              <label className="form-label" style={{ fontWeight: '600', color: colors.primary }}>Alamat Wallet</label>
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
                <label className="form-label" style={{ fontWeight: '600', color: colors.primary }}>Blockchain</label>
                <input
                  type="text"
                  className="form-control"
                  value="Ethereum"
                  readOnly
                  style={{ backgroundColor: colors.background, borderColor: colors.secondary }}
                />
              </div>
              <div className="col-6">
                <label className="form-label" style={{ fontWeight: '600', color: colors.primary }}>Token</label>
                <input
                  type="text"
                  className="form-control"
                  value="ETH"
                  readOnly
                  style={{ backgroundColor: colors.background, borderColor: colors.secondary }}
                />
              </div>
            </div>
          </div>
        );
      
      case "bank":
        return (
          <div className="payment-section" style={{ 
            backgroundColor: colors.white, 
            padding: '20px', 
            borderRadius: '12px',
            border: `2px solid ${colors.secondary}`
          }}>
            <h6 style={{ color: colors.primary, marginBottom: '15px' }}>🏦 Bank Transfer</h6>
            <div className="mb-3">
              <label className="form-label" style={{ fontWeight: '600', color: colors.primary }}>Pilih Bank</label>
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
                Transfer ke: {process.env.REACT_APP_BANK_ACCOUNT || "123-456-789"} (A/N DSAVEE STICKER)
              </div>
            </div>
          </div>
        );
      
      case "ewallet":
        return (
          <div className="payment-section" style={{ 
            backgroundColor: colors.white, 
            padding: '20px', 
            borderRadius: '12px',
            border: `2px solid ${colors.secondary}`
          }}>
            <h6 style={{ color: colors.primary, marginBottom: '15px' }}>📱 E-wallet</h6>
            <div className="mb-3">
              <label className="form-label" style={{ fontWeight: '600', color: colors.primary }}>Pilih E-wallet</label>
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
                Transfer ke: {process.env.REACT_APP_EWALLET_NUMBER || "08123456789"} (DSAVEE STICKER)
              </div>
            </div>
          </div>
        );
      
      case "cod":
        return (
          <div className="payment-section" style={{ 
            backgroundColor: colors.white, 
            padding: '20px', 
            borderRadius: '12px',
            border: `2px solid ${colors.secondary}`
          }}>
            <h6 style={{ color: colors.primary, marginBottom: '15px' }}>💰 Cash on Delivery (COD)</h6>
            <div className="alert" style={{ 
              backgroundColor: colors.accent, 
              color: colors.primary,
              border: `1px solid ${colors.secondary}`
            }}>
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

  return (
    <div style={{ 
      backgroundColor: colors.background, 
      minHeight: '100vh',
      padding: '20px 0',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Bubbles Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        zIndex: 1
      }}>
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: '-100px',
              width: `${Math.random() * 60 + 20}px`,
              height: `${Math.random() * 60 + 20}px`,
              left: `${Math.random() * 100}%`,
              backgroundColor: colors.secondary,
              borderRadius: '50%',
              opacity: 0.1,
              animation: `floatUp ${Math.random() * 20 + 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`
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

      <div className="container" style={{ 
        maxWidth: 1000, 
        position: 'relative', 
        zIndex: 2 
      }}>
        <div className="row justify-content-center">
          <div className="col-12">
            {/* Header */}
            <div className="text-center mb-5 fade-in" style={{ paddingTop: '30px' }}>
              <h1 style={{ 
                color: colors.primary, 
                fontWeight: '700',
                fontSize: '2.5rem',
                marginBottom: '10px'
              }}>
                Checkout
              </h1>
              <p style={{ color: colors.textLight, fontSize: '1.1rem' }}>
                Lengkapi informasi pengiriman dan pembayaran
              </p>
            </div>

            <div className="row">
              {/* Form */}
              <div className="col-lg-7">
                <div className="fade-in" style={{ 
                  backgroundColor: colors.white, 
                  padding: '30px', 
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px rgba(11, 25, 87, 0.15)',
                  marginBottom: '30px',
                  border: `1px solid ${colors.accent}`
                }}>
                  <h4 style={{ 
                    color: colors.primary, 
                    marginBottom: '25px', 
                    borderBottom: `2px solid ${colors.accent}`, 
                    paddingBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span style={{ 
                      backgroundColor: colors.primary,
                      color: colors.white,
                      borderRadius: '50%',
                      width: '35px',
                      height: '35px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem'
                    }}>📝</span>
                    Informasi Pengiriman
                  </h4>
                  
                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label" style={{ fontWeight: '600', color: colors.primary }}>Nama Penerima</label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          disabled={submitting}
                          style={{ 
                            borderColor: colors.secondary, 
                            borderRadius: '8px',
                            transition: 'all 0.3s ease'
                          }}
                          placeholder="Masukkan nama lengkap"
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label" style={{ fontWeight: '600', color: colors.primary }}>Nomor HP</label>
                        <input
                          type="tel"
                          className="form-control"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={submitting}
                          style={{ 
                            borderColor: colors.secondary, 
                            borderRadius: '8px',
                            transition: 'all 0.3s ease'
                          }}
                          placeholder="08xxxxxxxxxx"
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label" style={{ fontWeight: '600', color: colors.primary }}>Email</label>
                      <input
                        type="email"
                        className="form-control"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={submitting}
                        style={{ 
                          borderColor: colors.secondary, 
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        placeholder="email@example.com"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="form-label" style={{ fontWeight: '600', color: colors.primary }}>Alamat Pengiriman</label>
                      <textarea
                        className="form-control"
                        required
                        rows="3"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={submitting}
                        style={{ 
                          borderColor: colors.secondary, 
                          borderRadius: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        placeholder="Masukkan alamat lengkap termasuk RT/RW, Kecamatan, Kota"
                      />
                    </div>

                    {/* Metode Pembayaran */}
                    <h4 style={{ 
                      color: colors.primary, 
                      marginBottom: '20px', 
                      borderBottom: `2px solid ${colors.accent}`, 
                      paddingBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{ 
                        backgroundColor: colors.primary,
                        color: colors.white,
                        borderRadius: '50%',
                        width: '35px',
                        height: '35px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem'
                      }}>💳</span>
                      Metode Pembayaran
                    </h4>

                    <div className="mb-4">
                      <label className="form-label" style={{ fontWeight: '600', color: colors.primary }}>Pilih Metode</label>
                      <div className="row g-2">
                        {[
                          { value: "cod", label: "COD", desc: "Bayar di Tempat" },
                          { value: "bank", label: "Bank Transfer", desc: "Transfer Bank" },
                          { value: "ewallet", label: "E-wallet", desc: "Dompet Digital" },
                          { value: "crypto", label: "Crypto", desc: "Pembayaran Crypto" }
                        ].map((method) => (
                          <div key={method.value} className="col-6 mb-2">
                            <div
                              className={`payment-option ${paymentMethod === method.value ? 'active pulse-glow' : ''}`}
                              onClick={() => setPaymentMethod(method.value)}
                              style={{
                                padding: '15px',
                                border: `2px solid ${paymentMethod === method.value ? colors.primary : colors.secondary}`,
                                borderRadius: '12px',
                                backgroundColor: paymentMethod === method.value ? colors.primary : colors.white,
                                color: paymentMethod === method.value ? colors.white : colors.primary,
                                cursor: 'pointer',
                                textAlign: 'center',
                                transition: 'all 0.3s ease',
                                transform: paymentMethod === method.value ? 'scale(1.02)' : 'scale(1)'
                              }}
                            >
                              <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>
                                {getPaymentIcon(method.value)}
                              </div>
                              <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{method.label}</div>
                              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{method.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Input Spesifik Metode Pembayaran */}
                    {renderPaymentInputs()}

                    {/* Catatan Batas Waktu */}
                    <div className="alert mt-4" style={{ 
                      backgroundColor: colors.secondary, 
                      color: colors.primary,
                      border: `1px solid ${colors.primary}20`,
                      borderRadius: '12px',
                      animation: 'pulseGlow 2s infinite'
                    }}>
                      <strong>📋 Informasi Penting:</strong> {getPaymentDeadline()}
                    </div>

                    {/* Bukti Pembayaran (kecuali COD) */}
                    {paymentMethod !== "cod" && (
                      <div className="mb-4">
                        <label className="form-label" style={{ fontWeight: '600', color: colors.primary }}>Bukti Pembayaran (Opsional)</label>
                        <input
                          type="file"
                          className="form-control"
                          onChange={(e) => setProofFile(e.target.files[0] || null)}
                          disabled={submitting}
                          style={{ 
                            borderColor: colors.secondary, 
                            borderRadius: '8px',
                            padding: '8px'
                          }}
                        />
                        <small className="form-text" style={{ color: colors.textLight }}>
                          Upload bukti transfer/pembayaran untuk proses verifikasi yang lebih cepat
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
                          backgroundColor: submitting ? colors.textLight : colors.primary,
                          color: colors.white,
                          border: 'none',
                          borderRadius: '12px',
                          padding: '15px',
                          fontWeight: '600',
                          fontSize: '1.1rem',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {submitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Memproses Order...
                          </>
                        ) : (
                          <>
                            <span style={{ marginRight: '8px' }}>🛒</span>
                            Konfirmasi Order - Rp{total.toLocaleString('id-ID')}
                          </>
                        )}
                      </button>
                    </div>

                    {message && (
                      <div className={`alert mt-3 ${message.includes("❌") ? "alert-danger" : "alert-success"}`} style={{ borderRadius: '12px' }}>
                        {message}
                      </div>
                    )}
                  </form>
                </div>
              </div>

              {/* Ringkasan Order */}
              <div className="col-lg-5">
                <div className="fade-in" style={{ 
                  backgroundColor: colors.white, 
                  padding: '25px', 
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px rgba(11, 25, 87, 0.15)',
                  position: 'sticky',
                  top: '20px',
                  border: `1px solid ${colors.accent}`
                }}>
                  <h4 style={{ 
                    color: colors.primary, 
                    marginBottom: '20px', 
                    borderBottom: `2px solid ${colors.accent}`, 
                    paddingBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span style={{ 
                      backgroundColor: colors.primary,
                      color: colors.white,
                      borderRadius: '50%',
                      width: '35px',
                      height: '35px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem'
                    }}>🛍️</span>
                    Ringkasan Pesanan
                  </h4>
                  
                  <div className="order-items" style={{ maxHeight: '400px', overflowY: 'auto' }}>
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
                                  width: '50px',
                                  height: '50px',
                                  objectFit: 'cover',
                                  borderRadius: '8px',
                                  marginRight: '15px',
                                  border: `1px solid ${colors.accent}`
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                            <div>
                              <div style={{ fontWeight: '600', color: colors.primary, fontSize: '0.9rem' }}>
                                {it.name}
                              </div>
                              <small style={{ color: colors.textLight }}>{it.size || "Standard"}</small>
                              <div style={{ color: colors.textLight, fontSize: '0.8rem' }}>
                                Qty: {it.qty} × Rp{it.price.toLocaleString('id-ID')}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: '700', color: colors.primary }}>
                              Rp{(it.price * it.qty).toLocaleString('id-ID')}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4" style={{ color: colors.textLight }}>
                        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🛒</div>
                        Keranjang kosong
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-top" style={{ borderColor: `${colors.primary}30` }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div style={{ color: colors.textLight }}>Subtotal</div>
                      <div style={{ color: colors.textDark }}>Rp{total.toLocaleString('id-ID')}</div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div style={{ color: colors.textLight }}>Ongkos Kirim</div>
                      <div style={{ color: '#27ae60', fontWeight: '600' }}>Gratis</div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top" style={{ borderColor: `${colors.primary}30` }}>
                      <div style={{ fontWeight: '700', fontSize: '1.2rem', color: colors.primary }}>Total</div>
                      <div style={{ fontWeight: '800', fontSize: '1.3rem', color: colors.primary }}>
                        Rp{total.toLocaleString('id-ID')}
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