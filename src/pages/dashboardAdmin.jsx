import React, { useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import {
  getDatabase,
  ref as dbRef,
  onValue,
  set,
  update,
  push,
  remove,
} from "firebase/database";
import { useNavigate } from "react-router-dom";

const ADMIN_EMAIL = "dsaveesticker@gmail.com";

/* fallback/demo data */
const demoProducts = [
  {
    id: "p1",
    name: "Sticker A",
    price: 20000,
    currency: "IDR",
    description: "",
    image: "",
    sizes: ["Small"],
    variants: [],
    stock: 10,
  },
];
const demoUsers = [
  {
    uid: "u1",
    name: "Andi",
    email: "andi@example.com",
    phone: "081234567890",
    address: "",
  },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // products / orders / users (main states)
  const [products, setProducts] = useState(() => {
    try {
      const raw = localStorage.getItem("admin_products");
      return raw ? JSON.parse(raw) : demoProducts;
    } catch {
      return demoProducts;
    }
  });

  const [orders, setOrders] = useState(() => {
    try {
      const raw = localStorage.getItem("admin_orders");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [users, setUsers] = useState(() => {
    try {
      const raw = localStorage.getItem("admin_users");
      return raw ? JSON.parse(raw) : demoUsers;
    } catch {
      return demoUsers;
    }
  });

  // mapping orderId -> { uid, key } to perform updates
  const [orderDbIndex, setOrderDbIndex] = useState({});

  // persist local copies (demo convenience)
  useEffect(
    () => localStorage.setItem("admin_products", JSON.stringify(products)),
    [products]
  );
  useEffect(
    () => localStorage.setItem("admin_orders", JSON.stringify(orders)),
    [orders]
  );
  useEffect(
    () => localStorage.setItem("admin_users", JSON.stringify(users)),
    [users]
  );

  // ---------- ACCESS CONTROL ----------
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          navigate("/login", { replace: true });
          return;
        }
        if ((user.email || "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
          try {
            await signOut(auth);
          } catch {}
          alert("Access denied: hanya admin yang boleh mengakses halaman ini.");
          navigate("/", { replace: true });
        }
      },
      (err) => {
        console.error("onAuthStateChanged error:", err);
        navigate("/", { replace: true });
      }
    );
    return () => {
      if (typeof unsub === "function") unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // ---------- FIREBASE LISTENERS (products + users -> derive orders) ----------
  useEffect(() => {
    let db;
    try {
      db = getDatabase();
    } catch (err) {
      console.warn("Firebase not initialized", err);
      return;
    }

    // products
    const prRef = dbRef(db, "products");
    const unsubP = onValue(
      prRef,
      (snap) => {
        const val = snap.val();
        if (!val) {
          setProducts([]);
          return;
        }
        const arr = Object.entries(val).map(([key, v]) => {
          const variants = [];
          Object.keys(v || {}).forEach((k) => {
            const m = k.match(/^stock(\d+)$/i);
            if (m) {
              const idx = m[1];
              variants.push({
                id: `${key}-v${idx}`,
                name: v[`variantName${idx}`] || `Varian ${idx}`,
                stock: Number(v[`stock${idx}`] || 0),
                image: v[`image${idx}`] || null,
              });
            }
          });
          const sizes =
            typeof v.size === "string" && v.size.includes(",")
              ? v.size
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : v.size
              ? [v.size]
              : [];
          const keywords =
            typeof v.keyword === "string"
              ? v.keyword
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : Array.isArray(v.keyword)
              ? v.keyword
              : [];
          return {
            id: key,
            name: v.name || v.title || "Unnamed",
            price: Number(v.price || 0),
            stock: variants.length ? 0 : Number(v.stock || 0),
            currency: v.currency || "IDR",
            description: v.description || "",
            image: v.image || "",
            images: [v.image, v.image1, v.image2].filter(Boolean),
            badge: v.badge || "",
            keywords,
            sizes,
            variants,
            raw: v,
          };
        });
        setProducts(arr);
      },
      (err) => console.error("products onValue err", err)
    );

    // users -> flatten orders
    const usersRef = dbRef(db, "users");
    const unsubU = onValue(
      usersRef,
      (snap) => {
        const val = snap.val();
        if (!val) {
          setUsers([]);
          setOrders([]);
          setOrderDbIndex({});
          return;
        }
        const uArr = [];
        const ordersArr = [];
        const idx = {};
        Object.entries(val).forEach(([uid, uobj]) => {
          uArr.push({
            uid,
            name: uobj.name || uobj.displayName || "",
            email: uobj.email || "",
            phone: uobj.phone || uobj.phoneNumber || "",
            address: uobj.address || uobj.alamat || "",
            raw: uobj,
          });
          if (uobj.orders) {
            Object.entries(uobj.orders).forEach(([orderKey, orderObj]) => {
              const orderId = orderObj.oid || orderObj.order_id || orderKey;
              let createdAt =
                orderObj.createdAt ||
                orderObj.created_at ||
                orderObj.date ||
                null;
              if (createdAt && typeof createdAt === "number")
                createdAt = new Date(createdAt).toISOString();
              const productList = Array.isArray(orderObj.product)
                ? orderObj.product
                : orderObj.product && typeof orderObj.product === "object"
                ? Object.values(orderObj.product)
                : [];
              const firstProduct = productList.length ? productList[0] : null;
              const productName =
                (firstProduct && (firstProduct.name || firstProduct.title)) ||
                orderObj.productName ||
                orderObj.product ||
                "";

              const normalized = {
                order_id: String(orderId),
                created_at: createdAt,
                user_email: uobj.email || "",
                user_phone: orderObj.phone || uobj.phone || "",
                payment:
                  orderObj.method || orderObj.payment || orderObj.gateway || "",
                product: productName,
                product_id:
                  (firstProduct &&
                    (firstProduct.productId || firstProduct.id)) ||
                  null,
                total: Number(
                  orderObj.total || orderObj.totalPrice || orderObj.amount || 0
                ),
                currency: orderObj.currency || "IDR",
                status: orderObj.status || orderObj.state || "pending",
                uid,
                _dbKey: orderKey,
                raw: orderObj,
              };
              ordersArr.push(normalized);
              idx[String(orderId)] = { uid, key: orderKey };
            });
          }
        });
        setUsers(uArr);
        setOrders(ordersArr);
        setOrderDbIndex(idx);
      },
      (err) => console.error("users onValue err", err)
    );

    return () => {
      try {
        if (typeof unsubP === "function") unsubP();
      } catch {}
      try {
        if (typeof unsubU === "function") unsubU();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- HELPERS ----------
  const normalizeStatus = (s) => {
    if (!s && s !== 0) return "pending";
    const st = String(s).trim().toLowerCase();
    if (["pending", "created", "received"].includes(st)) return "pending";
    if (["processing", "processed", "confirmed"].includes(st))
      return "processing";
    if (["shipped", "to_courier", "sent", "dikirim"].includes(st))
      return "shipped";
    if (["in_transit", "on_delivery", "dalam_pengiriman"].includes(st))
      return "in_transit";
    if (
      ["delivered", "completed", "received_by_customer", "diterima"].includes(
        st
      )
    )
      return "delivered";
    if (["cancelled", "canceled", "void", "batal"].includes(st))
      return "cancelled";
    return "pending";
  };

  const statusOptions = [
    { value: "pending", label: "Pesanan Diterima" },
    { value: "processing", label: "Diproses oleh Penjual" },
    { value: "shipped", label: "Dikirim ke Kurir" },
    { value: "in_transit", label: "Dalam Pengiriman" },
    { value: "delivered", label: "Diterima oleh Pembeli" },
    { value: "cancelled", label: "Dibatalkan" },
  ];

  // METRICS - triple-checked per request:
  // 1) Total Pendapatan = sum of all orders.total (across all users)
  // 2) Jumlah Pelanggan = number of users (users.length)
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (acc, o) => acc + Number(o.total || 0),
      0
    );
    const pelangganCount = users.length;
    const jumlahProduk = products.length;
    return { totalOrders, totalRevenue, pelangganCount, jumlahProduk };
  }, [orders, users, products]);

  // ---------- Product modal (variants image inputs, hide top-level stock when variants exist) ----------
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({
    id: "",
    name: "",
    price: 0,
    currency: "IDR",
    description: "",
    image: "",
    badge: "",
    keywords: [],
    sizes: [],
    variants: [],
    stock: 0,
  });

  function openAddProduct() {
    setEditingProductId(null);
    setProductForm({
      id: `p${Date.now()}`,
      name: "",
      price: 0,
      currency: "IDR",
      description: "",
      image: "",
      badge: "",
      keywords: [],
      sizes: [],
      variants: [],
      stock: 0,
    });
    setProductModalOpen(true);
    setActiveTab("products");
  }

  function openEditProduct(p) {
    setEditingProductId(p.id);
    setProductForm({
      id: p.id,
      name: p.name || "",
      price: p.price || 0,
      currency: p.currency || "IDR",
      description: p.description || "",
      image: p.image || "",
      badge: p.badge || "",
      keywords: Array.isArray(p.keywords) ? p.keywords : [],
      sizes: Array.isArray(p.sizes) ? p.sizes : [],
      variants: Array.isArray(p.variants) ? p.variants : [],
      stock: p.stock || 0,
    });
    setProductModalOpen(true);
    setActiveTab("products");
  }

  // image read helper
  async function handleImageFileToDataUrl(file) {
    if (!file) return "";
    return await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = (e) => reject(e);
      fr.readAsDataURL(file);
    });
  }
  async function handleProductImageChange(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const dataUrl = await handleImageFileToDataUrl(f);
      setProductForm((s) => ({ ...s, image: dataUrl }));
    } catch (err) {
      console.error("Image read error", err);
    }
  }

  // variant helpers
  function addVariant() {
    setProductForm((s) => ({
      ...s,
      variants: [
        ...(s.variants || []),
        { id: `v${Date.now()}`, name: "", stock: 0, image: "" },
      ],
    }));
  }
  function updateVariant(idx, patch) {
    setProductForm((s) => {
      const vs = Array.isArray(s.variants) ? [...s.variants] : [];
      vs[idx] = { ...vs[idx], ...patch };
      return { ...s, variants: vs };
    });
  }
  function removeVariant(idx) {
    setProductForm((s) => {
      const vs = Array.isArray(s.variants) ? [...s.variants] : [];
      vs.splice(idx, 1);
      return { ...s, variants: vs };
    });
  }
  async function handleVariantImageChange(e, idx) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const dataUrl = await handleImageFileToDataUrl(f);
      updateVariant(idx, { image: dataUrl });
    } catch (err) {
      console.error("variant image error", err);
    }
  }

  // SAVE PRODUCT -> writes to Realtime DB (variant fields as variantName1/stock1/image1)
  async function saveProduct(e) {
    e.preventDefault();
    const dbWrite = {};
    dbWrite.name = productForm.name || "Unnamed";
    dbWrite.price = Number(productForm.price || 0);
    dbWrite.currency = productForm.currency || "IDR";
    dbWrite.description = productForm.description || "";
    if (productForm.image) dbWrite.image = productForm.image;
    if (productForm.badge) dbWrite.badge = productForm.badge;
    dbWrite.keyword = Array.isArray(productForm.keywords)
      ? productForm.keywords.join(", ")
      : String(productForm.keywords || "");
    dbWrite.size = Array.isArray(productForm.sizes)
      ? productForm.sizes.join(", ")
      : String(productForm.sizes || "");
    try {
      const db = getDatabase();
      if (productForm.variants && productForm.variants.length > 0) {
        productForm.variants.forEach((v, i) => {
          const idx = i + 1;
          dbWrite[`variantName${idx}`] = v.name || `Varian ${idx}`;
          dbWrite[`stock${idx}`] = Number(v.stock || 0);
          if (v.image) dbWrite[`image${idx}`] = v.image;
        });
      } else {
        dbWrite.stock = Number(productForm.stock || 0);
      }

      if (editingProductId) {
        await set(dbRef(db, `products/${editingProductId}`), dbWrite);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProductId ? { ...p, ...dbWrite } : p
          )
        );
      } else {
        const newRef = push(dbRef(db, "products"));
        await set(newRef, dbWrite);
        setProducts((prev) => [{ id: newRef.key, ...dbWrite }, ...prev]);
      }
      setProductModalOpen(false);
      setEditingProductId(null);
    } catch (err) {
      console.warn("Failed DB write, falling back to local state", err);
      if (editingProductId) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProductId ? { ...p, ...dbWrite } : p
          )
        );
      } else {
        const id = `local-${Date.now()}`;
        setProducts((prev) => [{ id, ...dbWrite }, ...prev]);
      }
      setProductModalOpen(false);
      setEditingProductId(null);
    }
  }

  async function deleteProduct(id) {
    if (!window.confirm("Hapus produk ini?")) return;
    try {
      const db = getDatabase();
      await remove(dbRef(db, `products/${id}`));
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.warn("Failed to remove from DB", err);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  }

  // ---------- ORDERS: search/pagination (orders) ----------
  const [orderSearch, setOrderSearch] = useState("");
  const [orderPage, setOrderPage] = useState(1);
  const ORDERS_PAGE_SIZE = 8;
  const [orderSortDesc, setOrderSortDesc] = useState(true);

  useEffect(() => {
    setOrders((prev) =>
      prev.map((o) => ({ ...o, status: normalizeStatus(o.status) }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSortedOrders = useMemo(() => {
    let list = [...orders];
    const q = String(orderSearch || "")
      .trim()
      .toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          String(o.order_id || "")
            .toLowerCase()
            .includes(q) ||
          (o.user_email || "").toLowerCase().includes(q) ||
          String(o.total || "")
            .toLowerCase()
            .includes(q)
      );
    }
    list.sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return orderSortDesc ? tb - ta : ta - tb;
    });
    return list;
  }, [orders, orderSearch, orderSortDesc]);

  const ordersTotalPages = Math.max(
    1,
    Math.ceil(filteredSortedOrders.length / ORDERS_PAGE_SIZE)
  );
  useEffect(() => {
    if (orderPage > ordersTotalPages) setOrderPage(ordersTotalPages);
  }, [ordersTotalPages, orderPage]);
  const pagedOrders = filteredSortedOrders.slice(
    (orderPage - 1) * ORDERS_PAGE_SIZE,
    orderPage * ORDERS_PAGE_SIZE
  );

  async function updateOrderStatus(order_id, newStatus) {
    const ns = normalizeStatus(newStatus);
    setOrders((prev) =>
      prev.map((o) => (o.order_id === order_id ? { ...o, status: ns } : o))
    );
    try {
      const mapping = orderDbIndex[String(order_id)];
      if (!mapping) return;
      const { uid, key } = mapping;
      const db = getDatabase();
      await update(dbRef(db, `users/${uid}/orders/${key}`), {
        status: ns,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Failed update order status in DB", err);
    }
  }

  function cancelOrder(order_id) {
    if (!window.confirm("Cancel this order?")) return;
    updateOrderStatus(order_id, "cancelled");
  }

  function addMockOrder() {
    const id = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      order_id: id,
      created_at: new Date().toISOString(),
      user_email: `user${Math.floor(Math.random() * 100)}@mail.com`,
      payment: "Bank Transfer",
      product: products.length ? products[0].name : "Unknown",
      total: 25000,
      currency: "IDR",
      status: "pending",
    };
    setOrders((prev) => [newOrder, ...prev]);
    setActiveTab("orders");
  }

  // view product modal for orders
  const [viewProductModalOpen, setViewProductModalOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null);
  function handleViewOrderProduct(order) {
    let found = null;
    if (order.product_id)
      found = products.find((p) => p.id === order.product_id);
    if (!found && order.product)
      found = products.find(
        (p) =>
          p.name && order.product.toLowerCase().includes(p.name.toLowerCase())
      );
    if (found) setViewingProduct(found);
    else
      setViewingProduct({
        name: order.product || "Unknown",
        price: order.total,
        currency: order.currency,
        sizes: [],
        description: "",
      });
    setViewProductModalOpen(true);
  }

  async function deleteUser(uid) {
    if (!window.confirm("Hapus akun pengguna ini?")) return;
    try {
      const db = getDatabase();
      await remove(dbRef(db, `users/${uid}`));
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch (err) {
      console.warn("Failed to remove user from DB", err);
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
    }
  }

  // ---------- REPORTS ----------
  const salesLast7Days = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        key,
        label: d.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
        }),
        revenue: 0,
      });
    }
    orders.forEach((o) => {
      const k = String(o.created_at || "").slice(0, 10);
      const idx = days.findIndex((d) => d.key === k);
      if (idx >= 0) days[idx].revenue += Number(o.total || 0);
    });
    return days;
  }, [orders]);

  const topProducts = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      const name = o.product || "Unknown";
      if (!map[name]) map[name] = { name, count: 0, revenue: 0 };
      map[name].count += 1;
      map[name].revenue += Number(o.total || 0);
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [orders]);

  // ---------- PRODUCT search (new) ----------
  const [productSearch, setProductSearch] = useState("");
  const filteredProducts = useMemo(() => {
    const q = String(productSearch || "")
      .trim()
      .toLowerCase();
    if (!q) return products;
    return products.filter((p) => (p.name || "").toLowerCase().includes(q));
  }, [products, productSearch]);

  // ---------- SETTINGS (added back) ----------
  const defaultSettings = {
    storeName: "Dsavee",
    logo: "",
    contactEmail: "store@example.com",
    contactPhone: "",
    paymentMethods: ["Bank Transfer"],
    shippingCost: 10000,
    instagram: "",
    tiktok: "",
  };
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem("admin_settings");
      const s = raw ? JSON.parse(raw) : defaultSettings;
      return { ...defaultSettings, ...s, storeName: "Dsavee" };
    } catch {
      return defaultSettings;
    }
  });

  // keep local storeName enforced + localStorage
  useEffect(() => {
    setSettings((s) => ({ ...s, storeName: "Dsavee" }));
    localStorage.setItem(
      "admin_settings",
      JSON.stringify({ ...settings, storeName: "Dsavee" })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.contactEmail,
    settings.contactPhone,
    settings.paymentMethods,
    settings.shippingCost,
    settings.logo,
    settings.instagram,
    settings.tiktok,
  ]);

  function handleSettingsChange(e) {
    const { name, value, type, checked } = e.target;
    if (name === "paymentMethods") {
      setSettings((s) => {
        const setPM = new Set(s.paymentMethods || []);
        if (checked) setPM.add(value);
        else setPM.delete(value);
        return { ...s, paymentMethods: Array.from(setPM) };
      });
      return;
    }
    if (type === "number") {
      setSettings((s) => ({ ...s, [name]: Number(value || 0) }));
      return;
    }
    if (name === "storeName") return;
    setSettings((s) => ({ ...s, [name]: value }));
  }

  async function handleLogoFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const dataUrl = await handleImageFileToDataUrl(f);
      setSettings((s) => ({ ...s, logo: dataUrl }));
    } catch (err) {
      console.error("Logo read error", err);
    }
  }

  // ---- INTEGRATE contact WITH Realtime DB ----
  // listen to /contact and sync into settings.contact*
  useEffect(() => {
    let db;
    try {
      db = getDatabase();
    } catch (err) {
      // firebase not initialized
      return;
    }
    const contactRef = dbRef(db, "contact");
    const unsubC = onValue(
      contactRef,
      (snap) => {
        const v = snap.val();
        if (!v) return;
        setSettings((s) => ({
          ...s,
          contactEmail: typeof v.email === "string" ? v.email : s.contactEmail,
          contactPhone: typeof v.phone === "string" ? v.phone : s.contactPhone,
          instagram:
            typeof v.instagram === "string" ? v.instagram : s.instagram,
          tiktok: typeof v.tiktok === "string" ? v.tiktok : s.tiktok,
        }));
      },
      (err) => {
        console.error("contact onValue err", err);
      }
    );
    return () => {
      try {
        if (typeof unsubC === "function") unsubC();
      } catch {}
    };
  }, []);

  // save contact to Realtime DB (path: contact)
  async function handleSaveSettings(e) {
    e.preventDefault();
    try {
      const db = getDatabase();
      await set(dbRef(db, "contact"), {
        email: settings.contactEmail || "",
        phone: settings.contactPhone || "",
        instagram: settings.instagram || "",
        tiktok: settings.tiktok || "",
      });
      // also keep local copy
      localStorage.setItem(
        "admin_settings",
        JSON.stringify({ ...settings, storeName: "Dsavee" })
      );
      alert("Contact settings saved to Realtime Database.");
    } catch (err) {
      console.warn("Failed to save contact to DB, saved locally instead", err);
      localStorage.setItem(
        "admin_settings",
        JSON.stringify({ ...settings, storeName: "Dsavee" })
      );
      alert("Gagal menulis ke Firebase — perubahan disimpan secara lokal.");
    }
  }

  // change password modal (demo)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  function handleChangePasswordSubmit(e) {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      alert("Password kosong atau tidak cocok.");
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setChangePasswordOpen(false);
    alert("Password admin berhasil diubah (demo).");
  }

  // ---------- small helpers ----------
  function currencyFormat(n, currency) {
    if (currency === "ETH") return String(n);
    try {
      return Number(n).toLocaleString("id-ID");
    } catch {
      return String(n);
    }
  }

  // ---------- UI ----------
  return (
    <div className="container my-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Dashboard Admin</h2>
          <small className="text-muted">
            Kelola produk, pesanan, pengguna, laporan & pengaturan toko
          </small>
        </div>
        <div></div>
      </div>

      <ul className="nav nav-tabs mb-4">
        {["overview", "products", "orders", "users", "reports", "settings"].map(
          (t) => (
            <li className="nav-item" key={t}>
              <button
                className={`nav-link ${activeTab === t ? "active" : ""}`}
                onClick={() => setActiveTab(t)}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            </li>
          )
        )}
      </ul>

      <div>
        {activeTab === "overview" && (
          <div>
            <div className="row g-3 mb-4">
              <StatCard title="Total Pesanan" value={metrics.totalOrders} />
              <StatCard
                title="Total Pendapatan"
                value={`Rp ${currencyFormat(metrics.totalRevenue, "IDR")}`}
              />
              <StatCard
                title="Jumlah Pelanggan"
                value={metrics.pelangganCount}
              />
              <StatCard title="Jumlah Produk" value={metrics.jumlahProduk} />
            </div>
          </div>
        )}

        {/* PRODUCTS with search box */}
        {activeTab === "products" && (
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Products</h5>
                <div className="d-flex align-items-center">
                  <input
                    type="search"
                    placeholder="Search product name"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="form-control form-control-sm me-2"
                    style={{ minWidth: 220 }}
                  />
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={openAddProduct}
                  >
                    + New Product
                  </button>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <p className="text-muted">No products available.</p>
              ) : (
                <div className="row">
                  {filteredProducts.map((p) => (
                    <div className="col-md-6 mb-3" key={p.id}>
                      <div className="card h-100">
                        <div className="card-body">
                          <h6 className="card-title mb-1">{p.name}</h6>
                          <div className="text-muted small">
                            Rp {currencyFormat(p.price, p.currency)}
                          </div>
                          <div className="small text-muted">
                            Stock:{" "}
                            {p.variants && p.variants.length
                              ? p.variants.reduce(
                                  (a, b) => a + Number(b.stock || 0),
                                  0
                                )
                              : p.stock}
                          </div>
                          <div className="small text-muted">
                            Size:{" "}
                            {Array.isArray(p.sizes)
                              ? p.sizes.join(", ")
                              : p.sizes || "-"}
                          </div>
                          <div className="mt-2">
                            <button
                              className="btn btn-sm btn-outline-primary me-2"
                              onClick={() => openEditProduct(p)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => deleteProduct(p.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ORDERS */}
        {activeTab === "orders" && (
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between mb-3">
                <h5 className="card-title mb-0">Orders</h5>
                <div className="d-flex">
                  <input
                    type="search"
                    placeholder="Search order id/email/amount"
                    value={orderSearch}
                    onChange={(e) => {
                      setOrderSearch(e.target.value);
                      setOrderPage(1);
                    }}
                    className="form-control form-control-sm me-2"
                    style={{ minWidth: 300 }}
                  />
                  <button
                    className="btn btn-sm btn-outline-secondary me-2"
                    onClick={() => setOrderSortDesc((s) => !s)}
                  >
                    Sort: {orderSortDesc ? "Newest" : "Oldest"}
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table
                  className="table table-sm align-middle small"
                  style={{ fontSize: "0.85rem" }}
                >
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Created</th>
                      <th>Email</th>
                      <th>Payment</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedOrders.map((o) => (
                      <tr key={o.order_id}>
                        <td className="fw-semibold">{o.order_id}</td>
                        <td>
                          {o.created_at
                            ? new Date(o.created_at).toLocaleString()
                            : "-"}
                        </td>
                        <td style={{ maxWidth: 180, wordBreak: "break-word" }}>
                          {o.user_email || "-"}
                        </td>
                        <td>{o.payment || "-"}</td>
                        <td>
                          {o.currency}{" "}
                          {currencyFormat(o.total || 0, o.currency || "IDR")}
                        </td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={normalizeStatus(o.status)}
                            onChange={(e) =>
                              updateOrderStatus(o.order_id, e.target.value)
                            }
                            style={{ width: "auto" }}
                          >
                            {statusOptions.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleViewOrderProduct(o)}
                            >
                              View Product
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => cancelOrder(o.order_id)}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pagedOrders.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center text-muted">
                          No orders found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between align-items-center mt-2">
                <div className="text-muted small">
                  Showing {filteredSortedOrders.length} orders
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </button>
                  <div className="border rounded px-2 py-1">
                    {orderPage} / {ordersTotalPages}
                  </div>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() =>
                      setOrderPage((p) => Math.min(ordersTotalPages, p + 1))
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* USERS */}
        {activeTab === "users" && (
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Users</h5>
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Address</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.uid}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.phone || "-"}</td>
                        <td style={{ maxWidth: 240, wordBreak: "break-word" }}>
                          {u.address || "-"}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => deleteUser(u.uid)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center text-muted">
                          No users
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* REPORTS */}
        {activeTab === "reports" && (
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Reports</h5>
              <div style={{ height: 260 }}>
                <MiniBarChart
                  data={salesLast7Days.map((d) => ({
                    label: d.label,
                    value: d.revenue,
                  }))}
                />
              </div>
              <div className="mt-3">
                <div className="small text-muted">
                  Total Pendapatan: Rp{" "}
                  {currencyFormat(metrics.totalRevenue, "IDR")}
                </div>
                <div className="small text-muted">
                  Total Pesanan: {metrics.totalOrders}
                </div>
              </div>

              <div className="mt-3">
                <h6>Top Products</h6>
                {topProducts.length === 0 ? (
                  <div className="text-muted small">No product data.</div>
                ) : (
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Orders</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((tp) => (
                        <tr key={tp.name}>
                          <td>{tp.name}</td>
                          <td>{tp.count}</td>
                          <td>Rp {currencyFormat(tp.revenue, "IDR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS (integrated with /contact in Realtime DB) */}
        {activeTab === "settings" && (
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Settings</h5>

              <form onSubmit={handleSaveSettings}>
                <div className="row">
                  <div className="col-md-8">
                    <div className="mb-2">
                      <label className="form-label">Store</label>
                      <input
                        name="storeName"
                        value={"Dsavee"}
                        disabled
                        className="form-control"
                      />
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-2">
                        <label className="form-label">Email</label>
                        <input
                          name="contactEmail"
                          value={settings.contactEmail}
                          onChange={handleSettingsChange}
                          className="form-control"
                        />
                      </div>
                      <div className="col-md-6 mb-2">
                        <label className="form-label">Phone</label>
                        <input
                          name="contactPhone"
                          value={settings.contactPhone}
                          onChange={handleSettingsChange}
                          className="form-control"
                        />
                      </div>
                    </div>

                    <div className="mb-2">
                      <label className="form-label">Shipping Cost</label>
                      <input
                        name="shippingCost"
                        type="number"
                        value={settings.shippingCost}
                        onChange={handleSettingsChange}
                        className="form-control"
                      />
                    </div>

                    <div className="mb-2">
                      <label className="form-label">Instagram</label>
                      <input
                        name="instagram"
                        value={settings.instagram}
                        onChange={handleSettingsChange}
                        className="form-control"
                        placeholder="@youraccount"
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label">TikTok</label>
                      <input
                        name="tiktok"
                        value={settings.tiktok}
                        onChange={handleSettingsChange}
                        className="form-control"
                        placeholder="@youraccount"
                      />
                    </div>

                    <div className="mt-3 d-flex gap-2">
                      <button type="submit" className="btn btn-primary">
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {productModalOpen && (
        <Modal
          onClose={() => {
            setProductModalOpen(false);
            setEditingProductId(null);
          }}
        >
          <h5>{editingProductId ? "Edit Product" : "Add Product"}</h5>
          <form onSubmit={saveProduct}>
            <div className="mb-2">
              <label className="form-label">Name</label>
              <input
                required
                className="form-control"
                value={productForm.name}
                onChange={(e) =>
                  setProductForm((s) => ({ ...s, name: e.target.value }))
                }
              />
            </div>

            <div className="row">
              <div className="col-md-4 mb-2">
                <label className="form-label">Price</label>
                <input
                  required
                  type="number"
                  className="form-control"
                  value={productForm.price}
                  onChange={(e) =>
                    setProductForm((s) => ({ ...s, price: e.target.value }))
                  }
                />
              </div>
              {!productForm.variants || productForm.variants.length === 0 ? (
                <div className="col-md-4 mb-2">
                  <label className="form-label">Stock</label>
                  <input
                    required
                    type="number"
                    className="form-control"
                    value={productForm.stock}
                    onChange={(e) =>
                      setProductForm((s) => ({ ...s, stock: e.target.value }))
                    }
                  />
                </div>
              ) : null}
            </div>

            <div className="mb-2">
              <label className="form-label">Image (thumbnail)</label>
              <div className="mb-2">
                <img
                  src={productForm.image || "/images/placeholder.png"}
                  alt="preview"
                  style={{
                    width: 120,
                    height: 80,
                    objectFit: "cover",
                    borderRadius: 6,
                  }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/images/placeholder.png";
                  }}
                />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleProductImageChange}
                className="form-control form-control-sm"
              />
            </div>

            <div className="mb-2">
              <label className="form-label">Badge</label>
              <input
                className="form-control"
                value={productForm.badge}
                onChange={(e) =>
                  setProductForm((s) => ({ ...s, badge: e.target.value }))
                }
                placeholder="-xx%"
              />
            </div>

            <div className="mb-2">
              <label className="form-label">Keyword</label>
              <input
                className="form-control"
                value={
                  Array.isArray(productForm.keywords)
                    ? productForm.keywords.join(", ")
                    : productForm.keywords
                }
                onChange={(e) =>
                  setProductForm((s) => ({ ...s, keywords: e.target.value }))
                }
                placeholder="sticker, vinyl"
              />
            </div>

            <div className="mb-2">
              <label className="form-label">Size</label>
              <input
                className="form-control"
                value={
                  Array.isArray(productForm.sizes)
                    ? productForm.sizes.join(", ")
                    : productForm.sizes
                }
                onChange={(e) =>
                  setProductForm((s) => ({ ...s, sizes: e.target.value }))
                }
                placeholder="Small, Medium, Large"
              />
            </div>

            {/* Variants editor */}
            <div className="mb-2">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label mb-0">Variants</label>
                <div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={addVariant}
                  >
                    + Add Variant
                  </button>
                  {productForm.variants && productForm.variants.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() =>
                        setProductForm((s) => ({ ...s, variants: [] }))
                      }
                    >
                      Clear Variants
                    </button>
                  )}
                </div>
              </div>

              {productForm.variants && productForm.variants.length > 0 ? (
                productForm.variants.map((v, idx) => (
                  <div
                    key={v.id}
                    className="d-flex gap-2 mb-2 align-items-center"
                  >
                    <input
                      className="form-control form-control-sm"
                      placeholder="Variant name"
                      value={v.name}
                      onChange={(e) =>
                        updateVariant(idx, { name: e.target.value })
                      }
                    />
                    <input
                      className="form-control form-control-sm"
                      type="number"
                      placeholder="Stock"
                      value={v.stock}
                      onChange={(e) =>
                        updateVariant(idx, {
                          stock: Number(e.target.value || 0),
                        })
                      }
                    />
                    <div style={{ minWidth: 120 }}>
                      <img
                        src={v.image || "/images/placeholder.png"}
                        alt="variant"
                        style={{
                          width: 100,
                          height: 60,
                          objectFit: "cover",
                          borderRadius: 6,
                        }}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/images/placeholder.png";
                        }}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleVariantImageChange(e, idx)}
                        className="form-control form-control-sm mt-1"
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => removeVariant(idx)}
                    >
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <div className="small text-muted">No variants</div>
              )}
            </div>

            <div className="d-flex justify-content-end gap-2 mt-3">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  setProductModalOpen(false);
                  setEditingProductId(null);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingProductId ? "Save changes" : "Create product"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Product Modal */}
      {viewProductModalOpen && viewingProduct && (
        <Modal
          onClose={() => {
            setViewProductModalOpen(false);
            setViewingProduct(null);
          }}
        >
          <h5>Product Details</h5>
          <div className="d-flex gap-3">
            <div style={{ minWidth: 120 }}>
              <img
                src={viewingProduct.image || "/images/placeholder.png"}
                alt={viewingProduct.name}
                style={{
                  width: 120,
                  height: 80,
                  objectFit: "cover",
                  borderRadius: 6,
                }}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/images/placeholder.png";
                }}
              />
            </div>
            <div>
              <div className="fw-semibold">{viewingProduct.name}</div>
              <div className="small text-muted">
                Rp{" "}
                {currencyFormat(
                  viewingProduct.price || 0,
                  viewingProduct.currency || "IDR"
                )}
              </div>
              <div className="small text-muted">
                Stock: {viewingProduct.stock ?? "-"}
              </div>
              <div className="small text-muted">
                Size:{" "}
                {Array.isArray(viewingProduct.sizes)
                  ? viewingProduct.sizes.join(", ")
                  : "-"}
              </div>
              <div className="mt-2">{viewingProduct.description}</div>
            </div>
          </div>
          <div className="mt-3 d-flex justify-content-end">
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setViewProductModalOpen(false);
                setViewingProduct(null);
              }}
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Change Password Modal (admin demo) */}
      {changePasswordOpen && (
        <Modal onClose={() => setChangePasswordOpen(false)}>
          <h5>Change Admin Password</h5>
          <form onSubmit={handleChangePasswordSubmit}>
            <div className="mb-2">
              <label className="form-label small">New Password</label>
              <input
                type="password"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="mb-2">
              <label className="form-label small">Confirm Password</label>
              <input
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setChangePasswordOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Change Password
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- small reusable components ---------------- */

function StatCard({ title, value }) {
  return (
    <div className="col-md-3">
      <div className="card p-3 h-100">
        <div className="small text-muted">{title}</div>
        <div className="h4">{value}</div>
      </div>
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div
      className="modal d-block"
      tabIndex="-1"
      role="dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content p-3">
          <div className="modal-body">{children}</div>
        </div>
      </div>
    </div>
  );
}

function MiniBarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const w = 700,
    h = 220,
    pad = 28;
  const barW = Math.max(12, (w - pad * 2) / data.length - 12);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="0" y="0" width={w} height={h} fill="#fff" />
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
        const y = pad + (h - pad * 2) * (1 - g);
        return (
          <line
            key={i}
            x1={pad}
            x2={w - pad}
            y1={y}
            y2={y}
            stroke="#eee"
            strokeWidth="1"
          />
        );
      })}
      {data.map((d, i) => {
        const totalBarSpace = barW + 12;
        const x = pad + i * totalBarSpace;
        const height = (h - pad * 2) * (d.value / max) || 0;
        const y = h - pad - height;
        return (
          <g key={d.label}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={height}
              rx="4"
              ry="4"
              fill="#0d6efd"
            />
            <text
              x={x + barW / 2}
              y={h - pad + 16}
              fontSize="10"
              textAnchor="middle"
              fill="#666"
            >
              {d.label}
            </text>
            <text
              x={x + barW / 2}
              y={y - 6}
              fontSize="10"
              textAnchor="middle"
              fill="#333"
            >
              Rp {String(Number(d.value).toLocaleString())}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
