// checkout.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

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
  runTransaction,
} from "firebase/database";

// Auth
import { getAuth, onAuthStateChanged } from "firebase/auth";

// PDF
import { jsPDF } from "jspdf";
import "jspdf";

// Cart context (sesuaikan path jika berbeda)
import { useCartState, useCartDispatch } from "../contexts/index";
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

// free shipping threshold (Rp)
const FREE_SHIPPING_THRESHOLD = 100000;
const DEFAULT_SHIPPING_COST = 10000;

export default function Checkout() {
  const navigate = useNavigate();

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

  // cart contexts
  const { items: ctxItems = [] } = useCartState();
  const dispatch = useCartDispatch();

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

  // transfer guest cart (localStorage) to user's RTDB cart (merge) on login
  const transferGuestCartToUser = async (uid) => {
    try {
      if (!uid) return;
      const raw = localStorage.getItem(GUEST_KEY);
      if (!raw) return;
      let guestArr = [];
      try {
        guestArr = JSON.parse(raw) || [];
        if (!Array.isArray(guestArr)) guestArr = [];
      } catch {
        guestArr = [];
      }
      if (!guestArr || guestArr.length === 0) return;

      const db = getDatabase();
      const userCartRef = dbRef(db, `users/${uid}/cart`);
      const snap = await get(userCartRef);
      let existing = snapshotToArray(snap.exists() ? snap.val() : null);

      // merge by key: id + variant + size + color (best-effort)
      const keyFor = (it) =>
        `${it.id || it.productId || ""}::${String(it.variant || "")}::${String(
          it.size || ""
        )}::${String(it.color || "")}`;

      const map = new Map();
      existing.forEach((it) => {
        const k = keyFor(it);
        map.set(k, { ...it });
      });
      guestArr.forEach((it) => {
        const normalized = {
          id: it.id ?? it.productId ?? it._cid ?? it.id,
          productId: it.productId ?? it.id ?? undefined,
          name: it.name ?? it.title ?? "Produk",
          price: Number(it.price) || 0,
          qty: Number(it.qty ?? it.quantity ?? 1) || 1,
          size: it.size ?? it.sizeName ?? "",
          variant: it.variant ?? it.selectedVariant ?? null,
          color: it.color ?? it.selectedColor ?? null,
          image: it.image ?? null,
          // keep original raw if present
          ...it,
        };
        const k = keyFor(normalized);
        if (map.has(k)) {
          const ex = map.get(k);
          ex.qty = Number(ex.qty || 0) + Number(normalized.qty || 0);
          map.set(k, ex);
        } else {
          map.set(k, normalized);
        }
      });

      const merged = Array.from(map.values());

      // write merged array to user's cart (best-effort)
      await set(userCartRef, merged);

      // clear guest cart localStorage
      localStorage.removeItem(GUEST_KEY);
    } catch (err) {
      console.warn("transferGuestCartToUser failed:", err);
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setAuthUser(u || null);
      setRemoteCartItems(null);

      // If user just signed in, transfer guest cart first, then attach listener
      if (u && u.uid) {
        try {
          await transferGuestCartToUser(u.uid);
        } catch (e) {
          console.warn("transfer error (ignored):", e);
        }

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
        // not logged in (guest)
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

  // choose source items: remote when loaded, otherwise context items or guest localStorage
  const guestItemsFromStorage = (() => {
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  })();

  const sourceItems =
    remoteCartItems !== null
      ? remoteCartItems
      : ctxItems && ctxItems.length
      ? ctxItems
      : guestItemsFromStorage;

  // normalize items (tambahkan variant/color jika ada supaya bisa deteksi stok varian)
  const normalizedItems = (sourceItems || []).map((it, idx) => ({
    _cid: it._cid ?? undefined,
    id: it.id ?? it.productId ?? `i-${idx}`,
    productId: it.productId ?? it.id ?? `product-${idx}`,
    name: it.name ?? it.title ?? "Produk",
    price: Number(it.price) || 0,
    qty: Number(it.qty) || Number(it.quantity) || 1,
    size: it.size ?? it.sizeName ?? "",
    image: it.image ?? null,
    // try to keep variant info if present (some cart implementations save variant/color)
    variant: it.variant ?? it.selectedVariant ?? null,
    color: it.color ?? it.selectedColor ?? null,
    imageField: it.imageField ?? null,
  }));

  const subtotal = normalizedItems.reduce(
    (s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 1),
    0
  );

  // shipping cost logic: free if subtotal (sticker-only total) > threshold
  const shippingCost =
    subtotal > FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_COST;

  const total = subtotal + shippingCost;

  // draft id logic
  const draftIdRef = useRef(null);
  useEffect(() => {
    let draftId = localStorage.getItem("dsavee_orderDraftId");
    if (!draftId) {
      draftId = `guest-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      try {
        localStorage.setItem("dsavee_orderDraftId", draftId);
      } catch {}
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

  // -----------------------
  // Stock-detection & update helpers
  // -----------------------

  function imageFieldToStockField(imageField) {
    if (!imageField) return "stock";
    const key = String(imageField || "").toLowerCase();
    if (key === "image" || key === "image0") return "stock";
    if (key === "image1") return "stock1";
    if (key === "image2") return "stock2";
    if (key.endsWith("1")) return "stock1";
    if (key.endsWith("2")) return "stock2";
    return "stock";
  }

  function detectStockFieldFromItem(productData = {}, item = {}) {
    try {
      if (!productData) return "stock";

      if (
        item.color &&
        typeof item.color === "object" &&
        item.color.imageField
      ) {
        return imageFieldToStockField(item.color.imageField);
      }
      if (item.imageField) {
        return imageFieldToStockField(item.imageField);
      }

      if (item.color && typeof item.color === "object" && item.color.image) {
        if (productData.image && productData.image === item.color.image)
          return "stock";
        if (productData.image1 && productData.image1 === item.color.image)
          return "stock1";
        if (productData.image2 && productData.image2 === item.color.image)
          return "stock2";
      }

      if (item.image) {
        if (productData.image && productData.image === item.image)
          return "stock";
        if (productData.image1 && productData.image1 === item.image)
          return "stock1";
        if (productData.image2 && productData.image2 === item.image)
          return "stock2";
      }

      if (item.variant !== null && item.variant !== undefined) {
        const maybeIdx = Number(item.variant);
        if (!Number.isNaN(maybeIdx)) {
          if (maybeIdx === 0) return "stock";
          if (maybeIdx === 1) return "stock1";
          if (maybeIdx === 2) return "stock2";
        }
        const m = String(item.variant).match(/\d+/);
        if (m) {
          const idx = Number(m[0]) - 1;
          if (idx === 0) return "stock";
          if (idx === 1) return "stock1";
          if (idx === 2) return "stock2";
        }
      }

      if (productData.hasOwnProperty("stock")) return "stock";
      if (productData.hasOwnProperty("stock1")) return "stock1";
      if (productData.hasOwnProperty("stock2")) return "stock2";
      return "stock";
    } catch (e) {
      console.error("detectStockFieldFromItem error:", e);
      return "stock";
    }
  }

  const decrementStockForItems = async (items = []) => {
    if (!items || items.length === 0) return;
    const db = getDatabase();

    for (const it of items) {
      const productId = it.productId || it.id;
      const qty = Number(it.qty || 0);
      if (!productId) continue;
      if (!qty || qty <= 0) continue;

      const productRef = dbRef(db, `products/${productId}`);
      let productData = null;

      try {
        const snap = await get(productRef);
        productData = snap.exists() ? snap.val() : null;

        const stockField =
          detectStockFieldFromItem(productData || {}, it) || "stock";

        await runTransaction(productRef, (current) => {
          if (current === null) return current;
          const cur = { ...current };

          if (cur[stockField] === undefined || cur[stockField] === null) {
            cur[stockField] = Number(cur[stockField] ?? 0);
          }

          const currentStock = Number(cur[stockField] || 0);
          const newStock = Math.max(0, currentStock - qty);
          cur[stockField] = newStock;

          return cur;
        });
      } catch (err) {
        console.warn(
          `Gagal transact mengurangi stok produk ${productId} (${it.name}):`,
          err
        );
        try {
          const fallbackField = detectStockFieldFromItem(productData || {}, it);
          const fallbackRef = dbRef(
            db,
            `products/${productId}/${fallbackField}`
          );
          await runTransaction(fallbackRef, (curVal) => {
            const curNum = Number(curVal || 0);
            return Math.max(0, curNum - qty);
          });
        } catch (err2) {
          console.error(
            `Fallback decrement stok failed untuk produk ${productId}:`,
            err2
          );
        }
      }
    }
  };

  // -----------------------
  // pdf generator
  // -----------------------
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

  const finalizeOrderCleanup = async () => {
    try {
      // 1) try dispatch CLEAR_CART (if your provider supports it)
      try {
        dispatch({ type: "CLEAR_CART" });
      } catch (ctxErr) {
        console.warn("CLEAR_CART dispatch failed or not supported:", ctxErr);
      }

      // 2) If removeFromCart exists (the hook used by OffcanvasCart), remove items one-by-one.
      try {
        if (typeof removeFromCart === "function") {
          const toRemove =
            (hookCart && hookCart.length ? hookCart : ctxItems) || [];
          for (const it of toRemove) {
            try {
              await removeFromCart({
                _cid: it._cid ?? undefined,
                id: it.id ?? it.productId,
                variant: it.variant ?? undefined,
              });
            } catch (itErr) {
              // ignore single-item failures and continue
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
        localStorage.removeItem(GUEST_KEY);
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
    // Prevent guests from submitting: require login/signup first
    if (!authUser) {
      setMessage(
        "Silakan daftar / login terlebih dahulu sebelum mengonfirmasi order. Klik Login atau Signup di kotak informasi di sebelah kanan."
      );
      return;
    }

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
        shipping: {
          courier: null,
          trackingNumber: null,
          status: "pending",
          cost: shippingCost, // store shipping cost
        },
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
            shippingCost,
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

        if (authUser && authUser.uid) {
          try {
            await update(dbRef(db, `users/${authUser.uid}/orders/${orderId}`), {
              status: "confirmed",
              txId,
            });
          } catch (e) {
            // ignore
          }
        }

        // ---- DECREMENT STOCK here for COD (confirmed) ----
        try {
          await decrementStockForItems(normalizedItems);
        } catch (stockErr) {
          console.error("Gagal mengurangi stok setelah COD:", stockErr);
          // proceed anyway
        }

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
        item_details: [
          ...normalizedItems.map((item) => ({
            id: item.productId,
            price: item.price,
            quantity: item.qty,
            name: item.name,
          })),
          {
            id: "SHIPPING",
            price: shippingCost,
            quantity: 1,
            name: shippingCost === 0 ? "Gratis Ongkir" : "Ongkos Kirim",
          },
        ],
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
          setSubmitting(true);
          setMessage("Pembayaran sukses, memproses order...");

          try {
            const midtransId =
              result.transaction_id ||
              (result.order_id ? result.order_id : null);

            // ---- DECREMENT STOCK here for Midtrans success (confirmed) ----
            try {
              await decrementStockForItems(normalizedItems);
            } catch (stockErr) {
              console.error(
                "Gagal mengurangi stok setelah Midtrans success:",
                stockErr
              );
              // proceed anyway
            }

            // update order status to confirmed and save txId
            try {
              await update(dbRef(db, `orders/${orderId}`), {
                status: "confirmed",
                "payment/status": "confirmed",
                "payment/txId": midtransId,
                txId: midtransId,
                updatedAt: serverTimestamp ? serverTimestamp() : Date.now(),
              });

              if (authUser && authUser.uid) {
                try {
                  await update(
                    dbRef(db, `users/${authUser.uid}/orders/${orderId}`),
                    { status: "confirmed", txId: midtransId }
                  );
                } catch (e) {
                  // ignore
                }
              }
            } catch (updateErr) {
              console.error(
                "Update order after midtrans success failed:",
                updateErr
              );
            }

            // robust cleanup - must ensure UI cart emptied
            await finalizeOrderCleanup();

            const orderForPdf = {
              txId: midtransId,
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
          } catch (err) {
            console.error("Error processing midtrans success:", err);
            setSubmitting(false);
            setMessage(
              "Terjadi kesalahan saat memproses order setelah pembayaran."
            );
          }
        },
        onPending: async (result) => {
          console.log("Midtrans pending:", result);
          try {
            const midtransId = result.transaction_id || result.order_id || null;
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

          // NOTE: for pending we DO NOT decrement stock. Wait until confirmed.
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

  // Render payment instructions
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
                    Telepon
                  </label>
                  <input
                    type="text"
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
                  placeholder="email@contoh.com"
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
                  placeholder="Alamat lengkap"
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
                  paddingBottom: 8,
                  borderBottom: `1px dashed ${colors.secondary}`,
                  marginBottom: 12,
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

              {/* If user is guest, show information block to prompt login/signup */}
              {!authUser && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: "#fff9f2",
                    border: `1px dashed ${colors.secondary}`,
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <i className="fas fa-receipt fa-3x text-muted mb-3"></i>
                    <h4 style={{ marginTop: 8 }}>Belum Login</h4>
                    <p style={{ color: colors.textLight }}>
                      Anda harus mendaftar atau masuk untuk menyelesaikan
                      pembelian. Barang yang ada di keranjang akan tetap
                      tersimpan setelah Anda mendaftar/masuk.
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "center",
                      }}
                    >
                      <Link
                        to={`/login?redirect=/checkout`}
                        className="btn"
                        style={{
                          backgroundColor: colors.primary,
                          color: colors.white,
                          padding: "8px 14px",
                          borderRadius: 8,
                          textDecoration: "none",
                          fontWeight: 600,
                        }}
                      >
                        Login
                      </Link>
                      <Link
                        to={`/signup?redirect=/checkout`}
                        className="btn"
                        style={{
                          backgroundColor: colors.secondary,
                          color: colors.primary,
                          padding: "8px 14px",
                          borderRadius: 8,
                          textDecoration: "none",
                          fontWeight: 600,
                        }}
                      >
                        Sign Up
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <button
                  type="submit"
                  disabled={submitting || !authUser}
                  style={{
                    backgroundColor: submitting
                      ? colors.textLight
                      : !authUser
                      ? "#d6d6d6"
                      : colors.primary,
                    color: colors.white,
                    padding: 12,
                    borderRadius: 12,
                    border: "none",
                    fontWeight: 600,
                    width: "100%",
                    cursor: submitting || !authUser ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting
                    ? "Memproses Order..."
                    : !authUser
                    ? "Silakan Login / Daftar untuk Melanjutkan"
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <div>Subtotal</div>
              <div>Rp{subtotal.toLocaleString("id-ID")}</div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
                color: shippingCost === 0 ? "green" : "inherit",
                fontWeight: shippingCost === 0 ? 700 : "normal",
              }}
            >
              <div>{shippingCost === 0 ? "Ongkir" : "Ongkir"}</div>
              <div>
                {shippingCost === 0
                  ? "Gratis"
                  : `Rp${shippingCost.toLocaleString("id-ID")}`}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
              }}
            >
              <div>Total</div>
              <div>Rp{total.toLocaleString("id-ID")}</div>
            </div>

            {subtotal > FREE_SHIPPING_THRESHOLD && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "green",
                  fontWeight: 600,
                }}
              >
                🎉 Selamat! Subtotal Anda di atas Rp
                {FREE_SHIPPING_THRESHOLD.toLocaleString("id-ID")} — gratis
                ongkir.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
