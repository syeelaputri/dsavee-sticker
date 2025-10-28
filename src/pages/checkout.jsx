// src/pages/Checkout.jsx
import React, { useState, useEffect, useRef } from "react";

// Realtime Database (backend logic)
import {
  getDatabase,
  ref as dbRef,
  push,
  set,
  update,
  serverTimestamp,
} from "firebase/database";

// PDF
import { jsPDF } from "jspdf";
import "jspdf";

// Cart context (sesuaikan path jika berbeda)
import { useCartState, useCartDispatch } from "../contexts/index";

const colors = {
  primary: "#0B1957",
  secondary: "#9ECCFA",
  background: "#F8F3EA",
  accent: "#E6D8C7",
  white: "#FFFFFF",
  textDark: "#1A1A1A",
  textLight: "#666666",
};

export default function Checkout() {
  // form fields
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // payment states — hanya 'cod' dan 'midtrans'
  const [paymentMethod, setPaymentMethod] = useState("cod");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  // states untuk PDF + success screen
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [orderData, setOrderData] = useState(null);

  const { items } = useCartState();
  const dispatch = useCartDispatch();

  // Normalisasi items
  const normalizedItems = (items || []).map((it, idx) => ({
    id: it.id ?? `i-${idx}`,
    productId: it.id ?? `product-${idx}`,
    name: it.name ?? it.title ?? "Produk",
    price: Number(it.price) || 0,
    qty: Number(it.qty) || 1,
    size: it.size ?? "",
    image: it.image ?? null,
  }));

  const subtotal = normalizedItems.reduce(
    (s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 1),
    0
  );
  const shippingCost = 0;
  const total = subtotal + shippingCost;

  // Draft id (opsional)
  const draftIdRef = useRef(null);
  useEffect(() => {
    let draftId = localStorage.getItem("dsavee_orderDraftId");
    if (!draftId) {
      draftId = `guest-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      localStorage.setItem("dsavee_orderDraftId", draftId);
    }
    draftIdRef.current = draftId;
  }, []);

  // Muat skrip Midtrans Snap secara dinamis
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", "Mid-client-yncxXrxPbo1proU3");
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Simple validation (dipakai sebelum submit)
  const validateForm = () => {
    if (!customerName.trim()) return "Masukkan nama penerima.";
    if (!address.trim()) return "Masukkan alamat pengiriman.";
    if (!phone.trim()) return "Masukkan nomor HP.";
    if (!email.trim()) return "Masukkan email.";
    if (normalizedItems.length === 0) return "Keranjang kosong.";
    return null;
  };

  const getPaymentDeadline = () => {
    switch (paymentMethod) {
      case "midtrans":
        return "Pembayaran diproses melalui Midtrans (lihat instruksi di popup Midtrans).";
      case "cod":
      default:
        return "Bayar ketika barang diterima";
    }
  };

  // PDF generator (sederhanakan bagian payment)
  const generateReceiptPDF = (order) => {
    try {
      if (!order) {
        alert("Data order tidak tersedia untuk membuat struk");
        return;
      }

      const doc = new jsPDF();
      // Header
      doc.setFontSize(20);
      doc.setTextColor(11, 25, 87);
      doc.text("DSAVEE STICKER", 105, 20, null, null, "center");

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("Struk Pembelian", 105, 30, null, null, "center");

      doc.setDrawColor(158, 204, 250);
      doc.line(20, 35, 190, 35);

      // Order meta
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`No. Order: ${order.txId || "N/A"}`, 20, 45);
      doc.text(`Tanggal: ${new Date().toLocaleDateString("id-ID")}`, 20, 52);
      doc.text(`Waktu: ${new Date().toLocaleTimeString("id-ID")}`, 20, 59);

      // Customer
      doc.text(`Nama: ${order.customerName || "N/A"}`, 20, 71);
      doc.text(`Telepon: ${order.phone || "N/A"}`, 20, 78);
      doc.text(`Email: ${order.email || "N/A"}`, 20, 85);

      // Alamat (wrap)
      const addressText = `Alamat: ${order.address || "N/A"}`;
      const addressLines = doc.splitTextToSize(addressText, 170);
      doc.text(addressLines, 20, 92);
      let startY = 92 + addressLines.length * 5;

      // Payment method
      doc.text(
        `Metode Pembayaran: ${(order.paymentMethod || "N/A").toUpperCase()}`,
        20,
        startY + 10
      );
      startY += 14;

      // Items (manual table)
      const tableRows = order.items || [];
      if (tableRows.length > 0) {
        let tableY = startY + 10;

        // header
        doc.setFillColor(11, 25, 87);
        doc.setTextColor(255, 255, 255);
        doc.rect(20, tableY, 170, 8, "F");
        doc.text("Produk", 22, tableY + 6);
        doc.text("Size", 85, tableY + 6);
        doc.text("Qty", 110, tableY + 6);
        doc.text("Harga", 125, tableY + 6);
        doc.text("Subtotal", 155, tableY + 6);

        doc.setTextColor(0, 0, 0);
        tableY += 12;

        order.items.forEach((item) => {
          if (tableY > 270) {
            doc.addPage();
            tableY = 20;
          }
          doc.text(item.name || "Produk", 22, tableY);
          doc.text(item.size || "-", 85, tableY);
          doc.text(String(item.qty), 110, tableY);
          doc.text(`Rp${item.price.toLocaleString("id-ID")}`, 125, tableY);
          doc.text(
            `Rp${(item.price * item.qty).toLocaleString("id-ID")}`,
            155,
            tableY
          );
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

      // Notes
      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      doc.setTextColor(100, 100, 100);
      let notesY = finalY + 15;
      doc.text(
        "Terima kasih telah berbelanja di DSAVEE STICKER!",
        105,
        notesY,
        null,
        null,
        "center"
      );
      notesY += 8;
      doc.text(
        "Simpan struk ini sebagai bukti pembelian.",
        105,
        notesY,
        null,
        null,
        "center"
      );
      notesY += 8;
      doc.text(
        "Untuk pertanyaan, hubungi customer service kami.",
        105,
        notesY,
        null,
        null,
        "center"
      );

      const fileName = `struk-${order.txId || "unknown"}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("Gagal generate PDF:", err);
      alert("Gagal menghasilkan struk PDF: " + err.message);
    }
  };

  // Handle submit: integrasi Midtrans Snap + RTDB + PDF
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    const validationError = validateForm();
    if (validationError) {
      setMessage(validationError);
      return;
    }
    setSubmitting(true);
    setMessage("Menyimpan order...");
    const db = getDatabase();
    let orderId = null;
    try {
      // Buat entry order baru di Firebase RTDB
      const ordersRef = dbRef(db, "orders");
      const newOrderRef = push(ordersRef);
      orderId = newOrderRef.key;

      // Susun order object awal (sederhana, hanya field yang relevan)
      const orderObj = {
        orderId,
        customerName,
        phone,
        email,
        address,
        items: normalizedItems,
        subtotal,
        shippingCost,
        total,
        currency: "IDR",
        status: paymentMethod === "cod" ? "pending_payment" : "pending",
        createdAt: serverTimestamp ? serverTimestamp() : Date.now(),
        updatedAt: serverTimestamp ? serverTimestamp() : Date.now(),
        payment: {
          method: paymentMethod,
          status: paymentMethod === "cod" ? "pending" : "pending_payment",
          txId: null,
          paymentDeadlineInfo: getPaymentDeadline(),
        },
        shipping: {
          courier: null,
          trackingNumber: null,
          status: "pending",
        },
      };

      // Simpan order awal ke Firebase
      await set(newOrderRef, orderObj);

      // Hapus draft jika ada
      if (draftIdRef.current) {
        try {
          await set(dbRef(db, `orderDrafts/${draftIdRef.current}`), null);
          localStorage.removeItem("dsavee_orderDraftId");
        } catch (err) {
          console.warn("Gagal hapus draft:", err);
        }
      }

      // Jika metode pembayaran COD (Cash on Delivery)
      if (paymentMethod === "cod") {
        // Proses COD (tanpa Midtrans)
        const txId = `COD-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 5)}`;
        await update(dbRef(db, `orders/${orderId}`), {
          "payment/txId": txId,
          txId,
          updatedAt: serverTimestamp ? serverTimestamp() : Date.now(),
        });

        // Kosongkan cart
        dispatch({ type: "CLEAR_CART" });

        // Siapkan data untuk struk PDF
        const orderForPdf = {
          txId,
          customerName,
          phone,
          email,
          address,
          items: normalizedItems,
          subtotal,
          shippingCost,
          total,
          paymentMethod,
          totalPaid: total,
        };

        setOrderData(orderForPdf);
        setOrderCompleted(true);
        setSubmitting(false);
        setMessage(
          `Order Berhasil Disimpan! Order ID: ${orderId}. ${getPaymentDeadline()}`
        );
        return;
      }

      // Non-COD: Gunakan Midtrans Snap
      // Kumpulkan detail transaksi untuk Midtrans
      const snapParams = {
        transaction_details: {
          order_id: orderId,
          gross_amount: total,
        },
        item_details: normalizedItems.map((item) => ({
          id: item.productId,
          price: item.price,
          quantity: item.qty,
          name: item.name,
        })),
        customer_details: {
          first_name: customerName,
          email: email,
          phone: phone,
        },
      };

      setMessage("Menghubungkan ke Midtrans...");
      // Panggil API Midtrans untuk token transaksi (gunakan Server Key di header)
      const tokenResponse = await fetch(
        "http://localhost:5000/api/create-midtrans",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(snapParams),
        }
      );

      const tokenData = await tokenResponse.json();
      console.log("Midtrans proxy response:", tokenResponse.status, tokenData);

      if (!tokenResponse.ok) {
        throw new Error(
          `Gagal membuat transaksi Midtrans. (${tokenResponse.status}) ${
            tokenData && tokenData.error ? tokenData.error : ""
          }`
        );
      }

      if (!tokenData || !tokenData.token) {
        throw new Error("Gagal mendapatkan token transaksi Midtrans");
      }

      // Panggil snap.js untuk menampilkan UI pembayaran Midtrans
      window.snap.pay(tokenData.token, {
        onSuccess: async (result) => {
          console.log("Midtrans success:", result);
          try {
            const midtransId = result.transaction_id;
            await update(dbRef(db, `orders/${orderId}`), {
              status: "confirmed",
              "payment/status": "confirmed",
              "payment/txId": midtransId,
              txId: midtransId,
              updatedAt: serverTimestamp ? serverTimestamp() : Date.now(),
            });
          } catch (err) {
            console.error("Update order after success failed:", err);
          }

          dispatch({ type: "CLEAR_CART" });

          const orderForPdf = {
            txId: result.transaction_id,
            customerName,
            phone,
            email,
            address,
            items: normalizedItems,
            subtotal,
            shippingCost,
            total,
            paymentMethod,
            totalPaid: total,
          };

          setOrderData(orderForPdf);
          setOrderCompleted(true);
          setSubmitting(false);
          setMessage("Pembayaran berhasil!");

          // PENTING: kembalikan false supaya Snap TIDAK melakukan redirect otomatis
          return false;
        },
        onPending: async (result) => {
          console.log("Midtrans pending:", result);
          try {
            const midtransId = result.transaction_id;
            await update(dbRef(db, `orders/${orderId}`), {
              status: "pending",
              "payment/status": "pending",
              "payment/txId": midtransId,
              txId: midtransId,
              updatedAt: serverTimestamp ? serverTimestamp() : Date.now(),
            });
          } catch (err) {
            console.error("Update order after pending failed:", err);
          }

          dispatch({ type: "CLEAR_CART" });

          const orderForPdf = {
            txId: result.transaction_id,
            customerName,
            phone,
            email,
            address,
            items: normalizedItems,
            subtotal,
            shippingCost,
            total,
            paymentMethod,
            totalPaid: total,
          };

          setOrderData(orderForPdf);
          setOrderCompleted(true);
          setSubmitting(false);
          setMessage(`Order Berhasil Disimpan! ${getPaymentDeadline()}`);

          // Cegah redirect default Snap
          return false;
        },
        onError: (result) => {
          console.error("Midtrans error (snap):", result);
          setSubmitting(false);
          const msg =
            (result && (result.status_message || result.message)) ||
            "Terjadi kesalahan pembayaran. Silakan coba lagi.";
          setMessage("Pembayaran gagal: " + msg);
        },
        onClose: () => {
          setSubmitting(false);
          setMessage("Pembayaran dibatalkan.");
        },
      });
    } catch (err) {
      console.error("Checkout error detail:", err);
      alert("Terjadi error: " + err.message);
      setSubmitting(false);
      setMessage("Gagal menyimpan order. Silakan coba lagi.");
    }
  };

  // Render input spesifik payment (hanya COD dan Midtrans)
  const renderPaymentInputs = () => {
    switch (paymentMethod) {
      case "midtrans":
        return (
          <div
            className="payment-section"
            style={{
              backgroundColor: colors.white,
              padding: 20,
              borderRadius: 12,
              border: `2px solid ${colors.secondary}`,
            }}
          >
            <h6 style={{ color: colors.primary, marginBottom: 15 }}>
              💳 Pembayaran Online (Midtrans)
            </h6>
            <div
              className="alert"
              style={{
                backgroundColor: colors.accent,
                color: colors.primary,
                border: `1px solid ${colors.secondary}`,
              }}
            >
              <strong>
                Setelah menekan konfirmasi, popup Midtrans akan muncul untuk
                menyelesaikan pembayaran.
              </strong>
              <br />
              Ikuti instruksi di popup (bisa menggunakan QR, e-wallet, atau
              virtual account tergantung pilihan di Midtrans).
            </div>
          </div>
        );
      case "cod":
      default:
        return (
          <div
            className="payment-section"
            style={{
              backgroundColor: colors.white,
              padding: 20,
              borderRadius: 12,
              border: `2px solid ${colors.secondary}`,
            }}
          >
            <h6 style={{ color: colors.primary, marginBottom: 15 }}>
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
    }
  };

  // Success screen
  if (orderCompleted) {
    return (
      <div
        style={{
          backgroundColor: colors.background,
          minHeight: "100vh",
          padding: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            backgroundColor: colors.white,
            padding: 40,
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(11,25,87,0.15)",
            maxWidth: 600,
            width: "100%",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: 20 }}>🎉</div>
          <h1 style={{ color: colors.primary, marginBottom: 20 }}>
            Checkout Berhasil!
          </h1>
          <p
            style={{
              color: colors.textLight,
              fontSize: "1.1rem",
              marginBottom: 30,
            }}
          >
            Terima kasih telah berbelanja di DSAVEE STICKER.{" "}
            {orderData && <>Struk Anda tersedia untuk diunduh.</>}
          </p>

          {orderData && (
            <div
              style={{
                backgroundColor: colors.background,
                padding: 20,
                borderRadius: 12,
                marginBottom: 30,
                textAlign: "left",
              }}
            >
              <h5 style={{ color: colors.primary, marginBottom: 15 }}>
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
                <strong>Status:</strong> {getPaymentDeadline()}
              </p>
            </div>
          )}

          <div className="d-grid gap-2 d-md-flex justify-content-md-center">
            <button
              className="btn me-md-2"
              onClick={() => {
                if (orderData) generateReceiptPDF(orderData);
                else
                  alert(
                    "Data order tidak tersedia. Silakan hubungi customer service."
                  );
              }}
              style={{
                backgroundColor: colors.primary,
                color: colors.white,
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontWeight: 600,
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
                borderRadius: 8,
                padding: "10px 20px",
                fontWeight: 600,
              }}
            >
              🏠 Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main checkout UI
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
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ textAlign: "center", paddingTop: 30, marginBottom: 30 }}>
          <h1
            style={{
              color: colors.primary,
              fontWeight: 700,
              fontSize: "2.5rem",
            }}
          >
            Checkout
          </h1>
          <p style={{ color: colors.textLight, fontSize: "1.1rem" }}>
            Lengkapi informasi pengiriman dan pembayaran
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 20,
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              flex: 1,
              backgroundColor: colors.white,
              padding: 30,
              borderRadius: 16,
              boxShadow: "0 8px 32px rgba(11,25,87,0.15)",
            }}
          >
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontWeight: 600, color: colors.primary }}>
                    Nama Penerima
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    disabled={submitting}
                    placeholder="Masukkan nama lengkap"
                    style={{
                      width: "100%",
                      padding: 8,
                      borderRadius: 8,
                      border: `1px solid ${colors.secondary}`,
                      marginBottom: 12,
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontWeight: 600, color: colors.primary }}>
                    Nomor HP
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={submitting}
                    placeholder="08xxxxxxxxxx"
                    style={{
                      width: "100%",
                      padding: 8,
                      borderRadius: 8,
                      border: `1px solid ${colors.secondary}`,
                      marginBottom: 12,
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontWeight: 600, color: colors.primary }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  placeholder="email@example.com"
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: `1px solid ${colors.secondary}`,
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontWeight: 600, color: colors.primary }}>
                  Alamat Pengiriman
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={submitting}
                  rows={3}
                  placeholder="Masukkan alamat lengkap"
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: `1px solid ${colors.secondary}`,
                  }}
                />
              </div>

              <h4
                style={{
                  color: colors.primary,
                  marginBottom: 10,
                  borderBottom: `2px solid ${colors.accent}`,
                  paddingBottom: 8,
                }}
              >
                Metode Pembayaran
              </h4>

              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {[
                  { value: "cod", label: "COD", desc: "Bayar di Tempat" },
                  {
                    value: "midtrans",
                    label: "Midtrans",
                    desc: "Pembayaran Online (Midtrans)",
                  },
                ].map((m) => (
                  <div
                    key={m.value}
                    onClick={() => setPaymentMethod(m.value)}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      cursor: "pointer",
                      border: `2px solid ${
                        paymentMethod === m.value
                          ? colors.primary
                          : colors.secondary
                      }`,
                      backgroundColor:
                        paymentMethod === m.value
                          ? colors.primary
                          : colors.white,
                      color:
                        paymentMethod === m.value
                          ? colors.white
                          : colors.primary,
                      flex: 1,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{m.label}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{m.desc}</div>
                  </div>
                ))}
              </div>

              {renderPaymentInputs()}

              <div style={{ marginTop: 12 }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    backgroundColor: submitting
                      ? colors.textLight
                      : colors.primary,
                    color: colors.white,
                    padding: 12,
                    borderRadius: 12,
                    border: "none",
                    fontWeight: 600,
                    width: "100%",
                  }}
                >
                  {submitting
                    ? "Memproses Order..."
                    : `Konfirmasi Order - Rp${total.toLocaleString("id-ID")}`}
                </button>
              </div>

              {message && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: message.includes("Gagal")
                      ? "#ffe6e6"
                      : "#e6f2ff",
                    color: colors.primary,
                  }}
                >
                  {message}
                </div>
              )}
            </form>
          </div>

          <div
            style={{
              width: 320,
              backgroundColor: colors.white,
              padding: 20,
              borderRadius: 16,
              boxShadow: "0 8px 32px rgba(11,25,87,0.08)",
            }}
          >
            <h4 style={{ color: colors.primary, marginBottom: 12 }}>
              Ringkasan Order
            </h4>
            <div style={{ marginBottom: 8 }}>
              {normalizedItems.map((it) => (
                <div
                  key={it.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{it.name}</div>
                    <div style={{ fontSize: 12, color: colors.textLight }}>
                      {it.size} • x{it.qty}
                    </div>
                  </div>
                  <div>Rp{(it.price * it.qty).toLocaleString("id-ID")}</div>
                </div>
              ))}
            </div>
            <hr />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>Subtotal</div>
              <div>Rp{subtotal.toLocaleString("id-ID")}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>Biaya Kirim</div>
              <div>Rp{shippingCost.toLocaleString("id-ID")}</div>
            </div>
            <hr />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>Total</strong>
              <strong>Rp{total.toLocaleString("id-ID")}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
