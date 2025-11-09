// src/pages/checkout.jsx
import React, { useState, useEffect, useRef } from "react";

// Realtime Database (backend logic)
import {
  getDatabase,
  ref as dbRef,
  push,
  set,
  update,
  serverTimestamp,
  onValue,
  get,
} from "firebase/database";

// Auth
import { getAuth, onAuthStateChanged } from "firebase/auth";

// PDF
import { jsPDF } from "jspdf";
import "jspdf";

// Cart context (sesuaikan path jika berbeda)
import { useCartState, useCartDispatch } from "../contexts/index";
// also import useCart (the hook used by OffcanvasCart) to call removeFromCart if available
import { useCart } from "../contexts/CartContext";

const colors = {
  primary: "#0B1957",
  secondary: "#9ECCFA",
  background: "#F8F3EA",
  accent: "#E6D8C7",
  white: "#FFFFFF",
  textDark: "#1A1A1A",
  textLight: "#666666",
};

// same guest key used elsewhere
const GUEST_KEY = "guest_cart_v1";

export default function Checkout() {
  // form fields
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  // phone hanya angka
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // payment states — hanya 'cod' dan 'midtrans'
  const [paymentMethod, setPaymentMethod] = useState("cod");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  // states untuk PDF + success screen
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [orderData, setOrderData] = useState(null);

  // cart contexts
  const { items: ctxItems = [] } = useCartState();
  const dispatch = useCartDispatch();

  // useCart provides imperative functions used by OffcanvasCart
  // we'll use removeFromCart as a fallback to forcibly remove items
  const {
    cart: hookCart = [],
    removeFromCart, // may be undefined in some implementations
  } = useCart();

  // --- remote cart listener & auth ---
  const [remoteCartItems, setRemoteCartItems] = useState(null); // null = not loaded yet
  const [authUser, setAuthUser] = useState(null);

  const snapshotToArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val
        .map((it) => (it && typeof it === "object" ? { ...it } : null))
        .filter(Boolean);
    }
    if (typeof val === "object") {
      return Object.entries(val)
        .map(([key, v]) => {
          if (!v || typeof v !== "object") return null;
          const looksLikeItem =
            "id" in v || "name" in v || "price" in v || "qty" in v;
          if (!looksLikeItem) return null;
          return { _cid: key, ...v };
        })
        .filter(Boolean);
    }
    return [];
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setAuthUser(u || null);
      setRemoteCartItems(null);

      if (u && u.uid) {
        try {
          const db = getDatabase();
          const cartRef = dbRef(db, `users/${u.uid}/cart`);

          const off = onValue(
            cartRef,
            (snap) => {
              const val = snap.val();
              const arr = snapshotToArray(val);
              setRemoteCartItems(arr);
            },
            (err) => {
              console.error("Error listening to user cart:", err);
              setRemoteCartItems([]); // fail-safe
            }
          );

          // prefill profile if available
          try {
            const userRef = dbRef(db, `users/${u.uid}`);
            const userSnap = await get(userRef);
            if (userSnap.exists()) {
              const ud = userSnap.val();
              if (!customerName && ud.name) setCustomerName(ud.name);
              if (!phone && ud.phone)
                setPhone(String(ud.phone).replace(/\D/g, ""));
              if (!email && ud.email) setEmail(ud.email);
              if (!address && ud.address) setAddress(ud.address);
            }
          } catch (prefillErr) {
            // ignore
          }

          return () => off();
        } catch (err) {
          console.error("setup cart listener failed:", err);
          setRemoteCartItems([]); // fail-safe
        }
      } else {
        setRemoteCartItems(null);
      }
    });

    return () => {
      try {
        unsubAuth();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // choose source items: remote when loaded, otherwise context items
  const sourceItems = remoteCartItems !== null ? remoteCartItems : ctxItems;

  // normalize items
  const normalizedItems = (sourceItems || []).map((it, idx) => ({
    _cid: it._cid ?? undefined,
    id: it.id ?? it.productId ?? `i-${idx}`,
    productId: it.productId ?? it.id ?? `product-${idx}`,
    name: it.name ?? it.title ?? "Produk",
    price: Number(it.price) || 0,
    qty: Number(it.qty) || Number(it.quantity) || 1,
    size: it.size ?? it.sizeName ?? "",
    image: it.image ?? null,
  }));

  const subtotal = normalizedItems.reduce(
    (s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 1),
    0
  );
  const shippingCost = 10000;
  const total = subtotal + shippingCost;

  // draft id logic
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

  // load midtrans script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", "Mid-client-yncxXrxPbo1proU3");
    script.async = true;
    document.body.appendChild(script);
    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) {}
    };
  }, []);

  // validation
  const validateForm = () => {
    if (!customerName.trim()) return "Masukkan nama penerima.";
    if (!address.trim()) return "Masukkan alamat pengiriman.";
    if (!phone.trim()) return "Masukkan nomor HP.";
    if (!/^\d+$/.test(phone)) return "Nomor HP hanya boleh berupa angka.";
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

  // pdf generator (same as before) - omitted here for brevity in explanation (kept in code)
  const generateReceiptPDF = (order) => {
    try {
      if (!order) {
        alert("Data order tidak tersedia untuk membuat struk");
        return;
      }
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.setTextColor(11, 25, 87);
      doc.text("DSAVEE STICKER", 105, 20, null, null, "center");
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("Struk Pembelian", 105, 30, null, null, "center");
      doc.setDrawColor(158, 204, 250);
      doc.line(20, 35, 190, 35);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`No. Order: ${order.txId || "N/A"}`, 20, 45);
      doc.text(`Tanggal: ${new Date().toLocaleDateString("id-ID")}`, 20, 52);
      doc.text(`Waktu: ${new Date().toLocaleTimeString("id-ID")}`, 20, 59);
      doc.text(`Nama: ${order.customerName || "N/A"}`, 20, 71);
      doc.text(`Telepon: ${order.phone || "N/A"}`, 20, 78);
      doc.text(`Email: ${order.email || "N/A"}`, 20, 85);
      const addressText = `Alamat: ${order.address || "N/A"}`;
      const addressLines = doc.splitTextToSize(addressText, 170);
      doc.text(addressLines, 20, 92);
      let startY = 92 + addressLines.length * 5;
      doc.text(
        `Metode Pembayaran: ${(order.paymentMethod || "N/A").toUpperCase()}`,
        20,
        startY + 10
      );
      startY += 14;
      const tableRows = order.items || [];
      if (tableRows.length > 0) {
        let tableY = startY + 10;
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
      const finalY = startY + 10;
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(
        `TOTAL: Rp${(order.total || 0).toLocaleString("id-ID")}`,
        150,
        finalY
      );
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

  /**
   * finalizeOrderCleanup - robust cleanup to ensure UI + server + local are empty
   */
  const finalizeOrderCleanup = async () => {
    try {
      // 1) try dispatch CLEAR_CART (if your provider supports it)
      try {
        dispatch({ type: "CLEAR_CART" });
      } catch (ctxErr) {
        console.warn("CLEAR_CART dispatch failed or not supported:", ctxErr);
      }

      // 2) If removeFromCart exists (the hook used by OffcanvasCart), remove items one-by-one.
      //    This ensures provider implementations that expect per-item removals are covered.
      try {
        if (typeof removeFromCart === "function") {
          // take a snapshot of current items from hookCart (preferred) or ctxItems
          const toRemove =
            (hookCart && hookCart.length ? hookCart : ctxItems) || [];
          for (const it of toRemove) {
            try {
              // Some implementations expect { _cid, id, variant } or { id, variant }
              await removeFromCart({
                _cid: it._cid ?? undefined,
                id: it.id ?? it.productId,
                variant: it.variant ?? undefined,
              });
            } catch (itErr) {
              // ignore single-item failures and continue
              // console.warn("removeFromCart failed for item:", it, itErr);
            }
          }
        }
      } catch (hookErr) {
        console.warn("removeFromCart loop error:", hookErr);
      }

      // 3) Clear RTDB cart for logged-in user (so remote listeners get empty array/null)
      try {
        const db = getDatabase();
        if (authUser && authUser.uid) {
          await set(dbRef(db, `users/${authUser.uid}/cart`), null);
        }
      } catch (dbErr) {
        console.warn("Failed to clear RTDB user cart:", dbErr);
      }

      // 4) Clear guest localStorage cart key
      try {
        // set to empty array or remove key depending on your provider expectations
        localStorage.removeItem(GUEST_KEY);
        // also set a fallback empty array
        try {
          localStorage.setItem(GUEST_KEY, JSON.stringify([]));
        } catch {}
      } catch (lsErr) {
        // ignore
      }

      // 5) update local state so Checkout UI immediately shows empty cart
      try {
        setRemoteCartItems([]);
      } catch (stErr) {
        // ignore
      }

      // 6) remove order draft if any (best-effort)
      try {
        const db = getDatabase();
        if (draftIdRef.current) {
          await set(dbRef(db, `orderDrafts/${draftIdRef.current}`), null);
          localStorage.removeItem("dsavee_orderDraftId");
        }
      } catch (draftErr) {
        // ignore
      }
    } catch (err) {
      console.error("finalizeOrderCleanup error:", err);
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
      const ordersRef = dbRef(db, "orders");
      const newOrderRef = push(ordersRef);
      orderId = newOrderRef.key;

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

      await set(newOrderRef, orderObj);

      // save under users/{uid}/orders if logged in
      try {
        if (authUser && authUser.uid) {
          const userOrderRef = dbRef(
            db,
            `users/${authUser.uid}/orders/${orderId}`
          );
          await set(userOrderRef, {
            oid: orderId,
            date: Date.now(),
            method: paymentMethod,
            total,
            status: orderObj.status,
            product: normalizedItems,
          });
        }
      } catch (userOrderErr) {
        console.warn(
          "Gagal menyimpan order ke users/{uid}/orders:",
          userOrderErr
        );
      }

      // Hapus draft jika ada (best-effort)
      if (draftIdRef.current) {
        try {
          await set(dbRef(db, `orderDrafts/${draftIdRef.current}`), null);
          localStorage.removeItem("dsavee_orderDraftId");
        } catch (err) {
          console.warn("Gagal hapus draft:", err);
        }
      }

      // COD flow
      if (paymentMethod === "cod") {
        const txId = `COD-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 5)}`;
        await update(dbRef(db, `orders/${orderId}`), {
          "payment/txId": txId,
          txId,
          updatedAt: serverTimestamp ? serverTimestamp() : Date.now(),
          status: "confirmed",
          "payment/status": "confirmed",
        });

        // robust cleanup
        await finalizeOrderCleanup();

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

      // Non-COD: Midtrans flow
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

      // call snap
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

            if (authUser && authUser.uid) {
              await update(
                dbRef(db, `users/${authUser.uid}/orders/${orderId}`),
                { status: "confirmed", txId: midtransId }
              );
            }
          } catch (err) {
            console.error("Update order after success failed:", err);
          }

          // robust cleanup - must ensure UI cart emptied
          await finalizeOrderCleanup();

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

            if (authUser && authUser.uid) {
              await update(
                dbRef(db, `users/${authUser.uid}/orders/${orderId}`),
                { status: "pending", txId: midtransId }
              );
            }
          } catch (err) {
            console.error("Update order after pending failed:", err);
          }

          // robust cleanup
          await finalizeOrderCleanup();

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
      alert("Terjadi error: " + (err.message || err));
      setSubmitting(false);
      setMessage("Gagal menyimpan order. Silakan coba lagi.");
    }
  };

  // renderPaymentInputs, success screen and UI are same as previously — omitted here to keep code compact in message
  // (Full UI is unchanged; ensure you copy the UI parts from your prior version)

  // For brevity in this message: reuse your existing renderPaymentInputs and UI markup exactly as before,
  // they depend on getPaymentDeadline(), normalizedItems, subtotal, total, etc.

  // Success screen and main UI (use the same markup as in your prior file).

  // --- Below: reuse the same renderPaymentInputs and return JSX from the prior code ---
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

  // Success screen (identical to your previous UI)
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

  // Main checkout UI (same as your previous implementation)
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
                    inputMode="numeric"
                    pattern="\d*"
                    value={phone}
                    onChange={(e) => {
                      const onlyDigits = e.target.value.replace(/\D/g, "");
                      setPhone(onlyDigits);
                    }}
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
              {normalizedItems.length === 0 ? (
                <div className="text-muted">Keranjang kosong</div>
              ) : (
                normalizedItems.map((it) => (
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
                ))
              )}
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
