// src/pages/OrderHistory.jsx
import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { getDatabase, ref as dbRef, onValue, get } from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { jsPDF } from "jspdf";

const OrderHistory = () => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofImage, setProofImage] = useState("");
  const [orders, setOrders] = useState([]); // orders berasal dari RTDB (users/{uid}/orders)
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const db = getDatabase();
  const ordersListenerRef = useRef(null);

  // styles & helpers
  const styles = {
    container: { minHeight: "100vh", padding: "2rem 0" },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "2rem",
    },
    card: {
      border: "none",
      borderRadius: "10px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    },
    tableHeader: { backgroundColor: "#343a40", color: "white" },
    badge: { fontSize: "0.75rem", padding: "0.5rem 0.75rem" },
    emptyState: { padding: "60px 20px", textAlign: "center" },
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0,0,0,0.5)",
      zIndex: 1050,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    modalContent: {
      backgroundColor: "white",
      borderRadius: "10px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
      maxWidth: "90%",
      maxHeight: "90%",
      overflow: "auto",
    },
    modalHeader: {
      padding: "1rem 1.5rem",
      borderBottom: "1px solid #dee2e6",
      backgroundColor: "#f8f9fa",
      borderRadius: "10px 10px 0 0",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    modalBody: { padding: "1.5rem" },
    modalFooter: {
      padding: "1rem 1.5rem",
      borderTop: "1px solid #dee2e6",
      display: "flex",
      justifyContent: "flex-end",
      gap: "0.5rem",
    },
    colorBadge: {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "12px",
      fontSize: "0.75rem",
      color: "white",
      textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
      border: "1px solid #ddd",
    },
    tableHover: { transition: "background-color 0.2s ease" },
    timeline: {
      listStyle: "none",
      paddingLeft: 0,
      marginTop: 12,
    },
    timelineItem: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      marginBottom: 12,
    },
    timelineDot: (done) => ({
      width: 14,
      height: 14,
      borderRadius: 14,
      backgroundColor: done ? "#198754" : "#dee2e6",
      display: "inline-block",
      flex: "0 0 14px",
      marginTop: 4,
    }),
    timelineContent: {
      flex: 1,
    },
    timelineTitleDone: { fontWeight: 700, color: "#198754" },
    timelineTitlePending: { fontWeight: 700, color: "#6c757d" },
    smallMuted: { fontSize: 12, color: "#6c757d" },
  };

  const mediaQueryStyles = `
    @media (max-width: 768px) {
      .table-responsive { font-size: 0.875rem; }
      .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.75rem; }
      .modal-content { margin: 1rem; max-width: 95%; }
      .header { flex-direction: column; gap: 1rem; text-align: center; }
    }
    @media (max-width: 576px) {
      .table th, .table td { padding: 0.5rem; }
      .btn-group { flex-direction: column; gap: 0.25rem; }
    }
    .table-hover tbody tr:hover { background-color: rgba(0,123,255,0.05) !important; }
    .btn-outline-primary:hover { transform: translateY(-1px); box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
    .btn:hover { transform: translateY(-1px); transition: all 0.2s ease; }
  `;

  // ---------- NORMALISASI STATUS ----------
  // Pastikan semua status yang dipakai adalah salah satu dari:
  // 'pending', 'processing', 'shipped', 'in_transit', 'delivered', 'cancelled'
  const normalizeStatus = (status) => {
    if (!status && status !== 0) return "pending";
    const s = String(status).trim().toLowerCase();

    // direct matches
    if (
      ["pending", "pending_payment", "received", "created", "new"].includes(s)
    )
      return "pending";
    if (
      [
        "processing",
        "processed",
        "confirming",
        "confirmed",
        "in_process",
      ].includes(s)
    )
      return "processing";
    if (["shipped", "to_courier", "sent", "dikirim", "on_courier"].includes(s))
      return "shipped";
    if (
      ["in_transit", "on_delivery", "dalam_pengiriman", "delivering"].includes(
        s
      )
    )
      return "in_transit";
    if (
      ["delivered", "completed", "received_by_customer", "diterima"].includes(s)
    )
      return "delivered";
    if (["cancelled", "canceled", "void", "batal"].includes(s))
      return "cancelled";

    // if not recognized, fallback to 'pending' (no unknown)
    return "pending";
  };

  // STATUS / LABELS MAPPING (sesuai permintaan)
  // Pesanan Diterima = pending
  // Diproses oleh Penjual = processing
  // Dikirim ke Kurir = shipped
  // Dalam Pengiriman = in_transit
  // Diterima oleh Pembeli = delivered
  // Dibatalkan = cancelled

  const getStatusBadge = (statusKey) => {
    const key = normalizeStatus(statusKey);
    const statusConfig = {
      pending: {
        style: { backgroundColor: "#ffc107", color: "black" },
        text: "Pesanan Diterima",
      },
      processing: {
        style: { backgroundColor: "#0dcaf0", color: "black" },
        text: "Diproses oleh Penjual",
      },
      shipped: {
        style: { backgroundColor: "#6f42c1", color: "white" },
        text: "Dikirim ke Kurir",
      },
      in_transit: {
        style: { backgroundColor: "#0d6efd", color: "white" },
        text: "Dalam Pengiriman",
      },
      delivered: {
        style: { backgroundColor: "#198754", color: "white" },
        text: "Diterima oleh Pembeli",
      },
      cancelled: {
        style: { backgroundColor: "#6c757d", color: "white" },
        text: "Dibatalkan",
      },
      failed: {
        style: { backgroundColor: "#dc3545", color: "white" },
        text: "Failed",
      },
    };
    const cfg = statusConfig[key] || statusConfig["pending"];
    return (
      <span style={{ ...styles.badge, ...cfg.style }} className="badge">
        {cfg.text}
      </span>
    );
  };

  const getStatusDescription = (status) => {
    const key = normalizeStatus(status);
    const descriptions = {
      pending:
        "Pesanan sudah dibuat, menunggu pembayaran atau konfirmasi awal.",
      processing: "Pembayaran diterima, pesanan sedang disiapkan oleh penjual.",
      shipped: "Pesanan telah diserahkan ke kurir untuk dikirim.",
      in_transit: "Pesanan sedang dalam pengiriman menuju alamat tujuan.",
      delivered: "Pesanan telah diterima oleh pembeli / transaksi selesai.",
      cancelled: "Pesanan dibatalkan.",
      failed: "Pembayaran gagal atau status bermasalah.",
    };
    // selalu mengembalikan deskripsi yang tersedia; fallback ke pending
    return descriptions[key] || descriptions["pending"];
  };

  const formatDate = (dateInput) => {
    if (!dateInput) return "N/A";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(Number(price || 0));

  const handleViewDetails = (order) => {
    // when opening details, attempt to enrich order (get full order data if root exists)
    if (!order) {
      setSelectedOrder(null);
      return;
    }

    const tryLoadFull = async () => {
      try {
        const orderId = order.id || order.oid || order.orderId;
        if (!orderId) {
          // ensure status normalized even for local object
          setSelectedOrder({ ...order, status: normalizeStatus(order.status) });
          return;
        }
        const snap = await get(dbRef(db, `orders/${orderId}`));
        if (snap.exists()) {
          const ord = snap.val();
          let items =
            ord.items ||
            ord.product ||
            order.items ||
            order.product ||
            (ord.products && Array.isArray(ord.products) && ord.products) ||
            [];
          if (items && typeof items === "object" && !Array.isArray(items)) {
            items = Object.values(items);
          }
          const merged = {
            ...order,
            ...ord,
            raw: ord.raw || order.raw || ord,
            items,
            createdAt: ord.createdAt || order.createdAt || ord.date || null,
            // normalize status
            status: normalizeStatus(
              ord.status ?? order.status ?? ord.state ?? "pending"
            ),
          };
          setSelectedOrder(merged);
        } else {
          setSelectedOrder({ ...order, status: normalizeStatus(order.status) });
        }
      } catch (err) {
        console.error("failed to load full order for details:", err);
        setSelectedOrder({ ...order, status: normalizeStatus(order.status) });
      }
    };

    tryLoadFull();
  };
  const handleCloseDetails = () => setSelectedOrder(null);
  const handleCloseProofModal = () => {
    setShowProofModal(false);
    setProofImage("");
  };
  const handleSubmitProof = (orderId) => {
    console.log("Submitting proof for order:", orderId, proofImage);
    alert("Proof of payment submitted successfully!");
    setShowProofModal(false);
    setProofImage("");
  };

  // ---------- PDF generator (mirip Checkout.generateReceiptPDF) ----------
  const generateReceiptPDF = (order, openInNewTab = true) => {
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
      doc.text(
        `No. Order: ${order.txId || order.orderId || order.id || "N/A"}`,
        20,
        45
      );
      doc.text(`Tanggal: ${new Date().toLocaleDateString("id-ID")}`, 20, 52);
      doc.text(`Waktu: ${new Date().toLocaleTimeString("id-ID")}`, 20, 59);

      doc.text(`Nama: ${order.customerName || order.name || "N/A"}`, 20, 71);
      doc.text(`Telepon: ${order.phone || "N/A"}`, 20, 78);
      doc.text(`Email: ${order.email || "N/A"}`, 20, 85);

      const addressText = `Alamat: ${
        order.address || order.shippingAddress || "N/A"
      }`;
      const addressLines = doc.splitTextToSize(addressText, 170);
      doc.text(addressLines, 20, 92);
      let startY = 92 + addressLines.length * 5;

      doc.text(
        `Metode Pembayaran: ${(
          order.paymentMethod ||
          order.payment?.method ||
          "N/A"
        ).toUpperCase()}`,
        20,
        startY + 10
      );
      startY += 14;

      const tableRows = order.items || order.product || [];
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

        tableRows.forEach((item) => {
          if (tableY > 270) {
            doc.addPage();
            tableY = 20;
          }
          const name = item.name || item.title || "Produk";
          const size = item.size || item.sizeName || "-";
          const qty = Number(item.qty ?? item.quantity ?? item.qty ?? 1);
          const price = Number(item.price ?? item.unitPrice ?? item.price ?? 0);
          doc.text(name, 22, tableY);
          doc.text(size, 85, tableY);
          doc.text(String(qty), 110, tableY);
          doc.text(`Rp${price.toLocaleString("id-ID")}`, 125, tableY);
          doc.text(`Rp${(price * qty).toLocaleString("id-ID")}`, 155, tableY);
          doc.setDrawColor(200, 200, 200);
          doc.line(20, tableY + 3, 190, tableY + 3);
          tableY += 10;
        });
        startY = tableY;
      }

      const finalY = startY + 10;
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      const totalVal = Number(
        order.total ??
          order.totalAmount ??
          order.totalPrice ??
          order.totalPaid ??
          0
      );
      doc.text(`TOTAL: Rp${totalVal.toLocaleString("id-ID")}`, 150, finalY);

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

      const fileName = `struk-${
        order.txId || order.orderId || order.id || "unknown"
      }.pdf`;

      if (openInNewTab) {
        try {
          const blob = doc.output("blob");
          const url = URL.createObjectURL(blob);
          window.open(url, "_blank");
        } catch (e) {
          doc.save(fileName);
        }
      } else {
        doc.save(fileName);
      }
    } catch (err) {
      console.error("Gagal generate PDF:", err);
      alert("Gagal menghasilkan struk PDF: " + (err.message || err));
    }
  };

  // Helper: cek apakah payment method adalah Midtrans (aktifkan invoice)
  const isPaidViaMidtrans = (order) => {
    const raw =
      (order &&
        (order.paymentMethod ||
          order.payment?.method ||
          order.raw?.payment?.method ||
          order.raw?.method ||
          order.raw?.paymentMethod)) ||
      "";
    const m = String(raw).toLowerCase();
    return m.includes("midtrans");
  };

  // Helper: cek apakah payment method adalah COD (nonaktifkan invoice)
  const isCOD = (order) => {
    const raw =
      (order &&
        (order.paymentMethod ||
          order.payment?.method ||
          order.raw?.payment?.method ||
          order.raw?.method ||
          order.raw?.paymentMethod)) ||
      "";
    const m = String(raw).toLowerCase();
    return (
      m.includes("cod") ||
      m.includes("cash on delivery") ||
      m.includes("cashondelivery")
    );
  };

  // ketika user klik invoice -> coba ambil data lengkap dari /orders/{orderId}, fallback ke order
  const handleInvoice = async (order) => {
    if (!order) return;
    if (!isPaidViaMidtrans(order)) {
      alert("Invoice hanya tersedia untuk pembayaran Midtrans.");
      return;
    }

    try {
      const orderId = order.id || order.oid || order.orderId;
      if (!orderId) {
        generateReceiptPDF(transformOrderForPdf(order), true);
        return;
      }
      const snap = await get(dbRef(db, `orders/${orderId}`));
      if (snap.exists()) {
        const ord = snap.val();
        const ordForPdf = {
          orderId: orderId,
          txId: ord.txId || ord.payment?.txId || orderId,
          customerName: ord.customerName || ord.name || ord.customer || "",
          phone: ord.phone || (ord.customer && ord.customer.phone) || "",
          email: ord.email || (ord.customer && ord.customer.email) || "",
          address:
            ord.address || ord.shipping?.address || order.shippingAddress || "",
          items: ord.items || ord.product || ord.products || [],
          subtotal: ord.subtotal ?? ord.total ?? 0,
          shippingCost:
            ord.shippingCost ?? (ord.shipping && ord.shipping.cost) ?? 0,
          total: ord.total ?? ord.grandTotal ?? ord.totalAmount ?? 0,
          paymentMethod:
            ord.payment?.method || ord.method || order.paymentMethod || "",
          totalPaid: ord.total ?? ord.totalAmount ?? 0,
        };
        generateReceiptPDF(ordForPdf, true);
      } else {
        generateReceiptPDF(transformOrderForPdf(order), true);
      }
    } catch (err) {
      console.error("fetch order for invoice failed:", err);
      generateReceiptPDF(transformOrderForPdf(order), true);
    }
  };

  // helper untuk membuat objek order yang cocok untuk PDF jika hanya punya data terbatas
  const transformOrderForPdf = (order) => {
    const items =
      order.items ||
      order.product ||
      order.products ||
      (order.raw && (order.raw.product || order.raw.items)) ||
      [];
    const normalizedItems = (items || []).map((it) => ({
      name: it.name || it.title || "Produk",
      size: it.size || it.sizeName || "-",
      qty: Number(it.quantity ?? it.qty ?? it.count ?? 1),
      price: Number(it.price ?? it.unitPrice ?? it.price ?? 0),
    }));
    const total =
      Number(order.totalAmount ?? order.total ?? order.totalPrice ?? 0) ||
      normalizedItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);

    return {
      id: order.id || order.oid || order.orderId,
      txId:
        (order.raw && order.raw.txId) || order.txId || order.id || order.oid,
      customerName:
        (order.raw && (order.raw.customerName || order.raw.name)) ||
        order.customerName ||
        "",
      phone: (order.raw && order.raw.phone) || "",
      email: (order.raw && order.raw.email) || "",
      address: order.shippingAddress || (order.raw && order.raw.address) || "",
      items: normalizedItems,
      subtotal: order.subtotal ?? total,
      shippingCost: order.shippingCost ?? 0,
      total,
      paymentMethod:
        (order.raw && (order.raw.method || order.raw.paymentMethod)) ||
        order.paymentMethod ||
        (order.raw && order.raw.payment && order.raw.payment.method) ||
        "",
      totalPaid: total,
    };
  };

  // ---------- TRACKING / TIMELINE helpers ----------
  // TRACKING_STAGES sekarang menyertakan label sesuai permintaan
  const TRACKING_STAGES = [
    { key: "received", label: "Pesanan Diterima" }, // pending
    { key: "processed", label: "Diproses oleh Penjual" }, // processing
    { key: "to_courier", label: "Dikirim ke Kurir" }, // shipped
    { key: "in_transit", label: "Dalam Pengiriman" }, // in_transit
    { key: "delivered", label: "Diterima oleh Pembeli" }, // delivered
  ];

  const statusToProgressIndex = (status) => {
    const s = normalizeStatus(status);
    if (s === "pending") return 1;
    if (s === "processing") return 2;
    if (s === "shipped") return 3;
    if (s === "in_transit") return 4;
    if (s === "delivered") return 5;
    if (s === "cancelled") return -1;
    return 1;
  };

  const buildTimeline = (order) => {
    if (!order) return [];
    const raw = order.raw || {};
    const tracking = raw.tracking || raw.timeline || raw.timestamps || {};
    const createdAt =
      order.createdAt ||
      order.date ||
      (raw && (raw.createdAt || raw.date || raw.timestamp)) ||
      null;
    const updatedAt =
      order.updatedAt ||
      (raw && (raw.updatedAt || raw.lastUpdated || raw.updated)) ||
      null;

    const normalized = normalizeStatus(order.status ?? (raw && raw.status));
    const progress = statusToProgressIndex(normalized);

    const entries = TRACKING_STAGES.map((stage, idx) => {
      let ts = null;
      // try multiple key variations
      if (tracking) {
        ts =
          tracking[stage.key] ||
          tracking[stage.key.toLowerCase()] ||
          tracking[stage.label] ||
          tracking[stage.label.toLowerCase()] ||
          null;
      }

      // if first step and createdAt present, use it
      if (!ts && stage.key === "received" && createdAt) ts = createdAt;

      // if step is at current progress index and timestamp missing, use updatedAt as fallback
      if (!ts && progress === idx + 1 && updatedAt) ts = updatedAt;

      const completed = Boolean(ts) || (progress >= idx + 1 && progress > 0);

      return {
        key: stage.key,
        label: stage.label,
        timestamp: ts
          ? typeof ts === "number"
            ? new Date(ts).toISOString()
            : ts
          : null,
        completed,
      };
    });

    // If cancelled in status/raw, append cancelled entry (with normalized handling)
    const isCancelled =
      normalized === "cancelled" ||
      String(order.status || "")
        .toLowerCase()
        .includes("cancel") ||
      String((raw && raw.status) || "")
        .toLowerCase()
        .includes("cancel");

    if (isCancelled) {
      const cancelTs =
        (order.raw && (order.raw.cancelledAt || order.raw.cancelled_at)) ||
        order.cancelledAt ||
        order.updatedAt ||
        null;
      entries.push({
        key: "cancelled",
        label: "Dibatalkan",
        timestamp: cancelTs
          ? typeof cancelTs === "number"
            ? new Date(cancelTs).toISOString()
            : cancelTs
          : null,
        completed: true,
      });
    }

    return entries;
  };

  const renderTimeline = (order) => {
    const entries = buildTimeline(order);
    return (
      <ul style={styles.timeline}>
        {entries.map((e) => {
          const done = !!e.completed;
          return (
            <li key={e.key} style={styles.timelineItem}>
              <span style={styles.timelineDot(done)} aria-hidden />
              <div style={styles.timelineContent}>
                <div
                  style={
                    done
                      ? styles.timelineTitleDone
                      : styles.timelineTitlePending
                  }
                >
                  {e.label}
                </div>
                <div style={styles.smallMuted}>
                  {e.timestamp
                    ? formatDate(e.timestamp)
                    : e.completed
                    ? "Tercapai (tanggal tidak tersedia)"
                    : "Belum tercapai"}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  // Ambil entry status terakhir yang completed (dipakai untuk kolom Status di tabel)
  const getTableStatusEntry = (order) => {
    const entries = buildTimeline(order || {});
    // cari last completed (reverse scan)
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].completed) return entries[i];
    }
    // fallback: always return first stage as pending
    return {
      key: "received",
      label: "Pesanan Diterima",
      timestamp: null,
      completed: false,
    };
  };

  const calcSubtotal = (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) return 0;
    return items.reduce((s, it) => {
      const price = Number(it.price ?? it.unitPrice ?? it.price ?? 0) || 0;
      const qty = Number(it.qty ?? it.quantity ?? it.count ?? 1) || 1;
      return s + price * qty;
    }, 0);
  };

  const extractShippingCost = (order) => {
    if (!order) return 0;
    if (order.shippingCost !== undefined)
      return Number(order.shippingCost) || 0;
    if (order.shipping && order.shipping.cost !== undefined)
      return Number(order.shipping.cost) || 0;
    if (order.raw && order.raw.shippingCost !== undefined)
      return Number(order.raw.shippingCost) || 0;
    if (
      order.raw &&
      order.raw.shipping &&
      order.raw.shipping.cost !== undefined
    )
      return Number(order.raw.shipping.cost) || 0;
    return Number(order.shippingCost ?? 0) || 0;
  };

  // listen auth changes -> attach RTDB listener ke users/{uid}/orders
  useEffect(() => {
    setLoading(true);
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      // clear previous orders listener
      if (ordersListenerRef.current) {
        try {
          ordersListenerRef.current();
        } catch (e) {}
        ordersListenerRef.current = null;
      }

      if (currentUser && currentUser.uid) {
        const userOrdersRef = dbRef(db, `users/${currentUser.uid}/orders`);
        const off = onValue(
          userOrdersRef,
          (snap) => {
            const val = snap.val();
            let arr = [];

            if (!val) {
              arr = [];
            } else if (Array.isArray(val)) {
              arr = val
                .map((it, idx) =>
                  it ? { id: it.oid || it.id || `ord-${idx}`, ...it } : null
                )
                .filter(Boolean);
            } else if (typeof val === "object") {
              arr = Object.entries(val).map(([key, v]) => {
                let items = v.product ?? v.items ?? v.products ?? [];
                if (
                  items &&
                  typeof items === "object" &&
                  !Array.isArray(items)
                ) {
                  items = Object.values(items);
                }
                // normalize status here to avoid any "unknown"
                const normalizedStatus = normalizeStatus(
                  v.status ?? v.state ?? v.orderStatus ?? "pending"
                );
                return {
                  id: v.oid || v.id || key,
                  items,
                  totalAmount: v.total ?? v.totalAmount ?? v.totalPrice ?? 0,
                  paymentMethod:
                    v.method ?? v.paymentMethod ?? v.payment ?? "Unknown",
                  status: normalizedStatus,
                  createdAt:
                    v.date ?? v.createdAt ?? v.timestamp ?? v.time ?? null,
                  shippingAddress: v.shippingAddress ?? v.address ?? null,
                  raw: v,
                };
              });
            } else {
              arr = [];
            }

            arr = arr.map((o) => ({
              ...o,
              createdAt: o.createdAt
                ? typeof o.createdAt === "number"
                  ? new Date(o.createdAt).toISOString()
                  : o.createdAt
                : null,
              totalAmount: Number(o.totalAmount || 0),
            }));

            arr.sort((a, b) => {
              const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return tb - ta;
            });

            setOrders(arr);
            setLoading(false);
          },
          (err) => {
            console.error("onValue orders error:", err);
            setOrders([]);
            setLoading(false);
          }
        );

        ordersListenerRef.current = () => off();
      } else {
        setLoading(false);
      }
    });

    return () => {
      try {
        unsubAuth();
      } catch (e) {}
      if (ordersListenerRef.current) {
        try {
          ordersListenerRef.current();
        } catch (e) {}
        ordersListenerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={styles.container}>
      <style>{mediaQueryStyles}</style>

      <div className="container">
        <div className="row">
          <div className="col-12">
            <div style={styles.header} className="header">
              <h2>Order History</h2>
              <span className="text-muted">
                {orders.length} order{orders.length !== 1 ? "s" : ""}
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-5">
                <div style={styles.emptyState} className="empty-state">
                  <i className="fas fa-receipt fa-3x text-muted mb-3"></i>
                  <h4>Belum ada pesanan</h4>
                  <p className="text-muted mb-4">
                    Mulai berbelanja dan temukan stiker favorit Anda!
                  </p>
                  <Link to="/products" className="btn btn-primary">
                    Belanja Sekarang
                  </Link>
                </div>
              </div>
            ) : (
              <div style={styles.card} className="card">
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead style={styles.tableHeader}>
                        <tr>
                          <th>Order ID</th>
                          <th>Tanggal</th>
                          <th>Metode Pembayaran</th>
                          <th>Total</th>
                          <th>Status</th>
                          <th>Detail</th>
                          <th>Invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => {
                          const invoiceEnabled =
                            isPaidViaMidtrans(order) && !isCOD(order);
                          const tooltip = invoiceEnabled
                            ? "Buka invoice (Midtrans)"
                            : "Invoice hanya tersedia untuk pembayaran Midtrans";

                          // ambil status dari timeline (agar sinkron dengan modal Detail)
                          const statusEntry = getTableStatusEntry(order);

                          return (
                            <tr key={order.id} style={styles.tableHover}>
                              <td>
                                <strong>{order.id}</strong>
                              </td>
                              <td>{formatDate(order.createdAt)}</td>
                              <td>{order.paymentMethod}</td>
                              <td>
                                <strong>
                                  {formatPrice(order.totalAmount)}
                                </strong>
                              </td>
                              <td>{getStatusBadge(order.status)}</td>
                              <td>
                                <div className="btn-group">
                                  <button
                                    className="btn btn-sm btn-outline-primary me-2"
                                    onClick={() => handleViewDetails(order)}
                                  >
                                    <i className="fas fa-eye me-1"></i> Detail
                                  </button>
                                </div>
                              </td>
                              <td>
                                <button
                                  className={`btn btn-sm ${
                                    invoiceEnabled
                                      ? "btn-outline-secondary"
                                      : "btn-outline-secondary disabled"
                                  }`}
                                  onClick={() =>
                                    invoiceEnabled && handleInvoice(order)
                                  }
                                  disabled={!invoiceEnabled}
                                  title={tooltip}
                                >
                                  <i className="fas fa-file-pdf me-1"></i>{" "}
                                  Invoice
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Details Modal - ONLY Items & Tracking */}
      {selectedOrder && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: "900px" }}>
            <div style={styles.modalHeader}>
              <h5 className="modal-title mb-0">
                Detail Pesanan - {selectedOrder.id}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={handleCloseDetails}
              ></button>
            </div>
            <div style={styles.modalBody}>
              {/* Items */}
              <h6 className="mt-2 mb-3">Items</h6>
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th>Varian</th>
                      <th>Qty</th>
                      <th>Harga</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(selectedOrder.items) &&
                    selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item, index) => {
                        const qty = item.quantity ?? item.qty ?? 1;
                        const price = item.price ?? item.unitPrice ?? 0;
                        return (
                          <tr key={index}>
                            <td>{item.name}</td>
                            <td>
                              {item.color || item.variant || item.size || "-"}
                            </td>
                            <td>{qty}</td>
                            <td>{formatPrice(price)}</td>
                            <td>{formatPrice(price * qty)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center">
                          No items data
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="4" className="text-end">
                        <strong>Ongkir:</strong>
                      </td>
                      <td>
                        <strong>
                          {formatPrice(extractShippingCost(selectedOrder))}
                        </strong>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="4" className="text-end">
                        <strong>Total:</strong>
                      </td>
                      <td>
                        <strong>
                          {formatPrice(
                            calcSubtotal(selectedOrder.items) +
                              extractShippingCost(selectedOrder)
                          )}
                        </strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Tracking timeline */}
              <h6 className="mt-4 mb-2">Order Tracking</h6>

              {/* NOTE: Bagian "Status Pesanan:" dihapus sesuai permintaan.
                  Timeline di bawah masih menampilkan setiap langkah + waktu tercapai. */}

              {/* Timeline: setiap langkah menampilkan label + waktu tercapai */}
              <div>{renderTimeline(selectedOrder)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Proof of Payment Modal */}
      {showProofModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: "500px" }}>
            <div style={styles.modalHeader}>
              <h5 className="modal-title mb-0">Upload Proof of Payment</h5>
              <button
                type="button"
                className="btn-close"
                onClick={handleCloseProofModal}
              ></button>
            </div>
            <div style={styles.modalBody}>
              <div className="mb-3">
                <label className="form-label">Upload bukti pembayaran:</label>
                <input
                  type="file"
                  className="form-control"
                  accept="image/*,.pdf"
                  onChange={(e) => setProofImage(e.target.files[0])}
                />
                <div className="form-text">
                  Upload screenshot bukti transfer atau pembayaran (JPG, PNG,
                  PDF)
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Atau paste link gambar:</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="https://example.com/proof.jpg"
                  value={proofImage}
                  onChange={(e) => setProofImage(e.target.value)}
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseProofModal}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSubmitProof(selectedOrder?.id)}
                disabled={!proofImage}
              >
                Submit Proof
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
