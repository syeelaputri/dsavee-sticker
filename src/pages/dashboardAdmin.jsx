// src/pages/dashboardAdmin.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

/**
 * Admin Dashboard (updated)
 * - Access control: ONLY dsaveesticker@gmail.com (hard check)
 * - Product cards show ONLY: name, price, stock, size(s)
 * - Orders table: Product column removed; Status is dropdown-only
 * - Orders: "View Product" button remains in Action (opens modal)
 * - Reports: MiniBarChart adjusted to avoid squashed ("gepeng") appearance
 *
 * Data persisted to localStorage for demo:
 * - admin_products, admin_orders, admin_users, admin_settings
 */

const ADMIN_EMAIL = "dsaveesticker@gmail.com";

export default function AdminDashboard() {
  // ---------- demo / initial data ----------
  const demoProducts = [
    {
      id: "p1",
      name: "Sticker A",
      price: 20000,
      stock: 50,
      currency: "IDR",
      description: "Sticker A - high quality vinyl",
      image: "",
      badge: "Best Seller",
      keywords: ["sticker", "vinyl"],
      sizes: ["Small", "Medium"],
      variants: [
        { id: "v1", name: "Pink", stock: 20 },
        { id: "v2", name: "Blue", stock: 30 },
      ],
    },
    {
      id: "p2",
      name: "Sticker B",
      price: 0.01,
      stock: 20,
      currency: "ETH",
      description: "Sticker B - crypto edition",
      image: "",
      badge: "",
      keywords: ["crypto", "limited"],
      sizes: ["One Size"],
      variants: [],
    },
  ];

  const demoOrders = [
    {
      order_id: "ORD-1001",
      created_at: "2025-10-10T09:15:00Z",
      updated_at: "2025-10-10T09:15:00Z",
      user_email: "andi@example.com",
      user_phone: "081234567890",
      payment: "Crypto",
      product: "Sticker A (Pink)",
      product_id: "p1",
      total: 20000,
      currency: "IDR",
      status: "pending",
    },
    {
      order_id: "ORD-1002",
      created_at: "2025-10-12T12:00:00Z",
      updated_at: "2025-10-12T12:30:00Z",
      user_email: "budi@example.com",
      user_phone: "081298765432",
      payment: "Bank Transfer",
      product: "Sticker B",
      product_id: "p2",
      total: 50000,
      currency: "IDR",
      status: "delivered",
    },
    {
      order_id: "ORD-1003",
      created_at: "2025-10-13T08:00:00Z",
      updated_at: "2025-10-14T10:00:00Z",
      user_email: "citra@example.com",
      user_phone: "081300011122",
      payment: "Midtrans",
      product: "Sticker A (Blue)",
      product_id: "p1",
      total: 65000,
      currency: "IDR",
      status: "processing",
    },
  ];

  const demoUsers = [
    {
      uid: "u1",
      name: "Andi",
      email: "andi@example.com",
      phone: "081234567890",
      address: "Jl. Merdeka 1",
    },
    {
      uid: "u2",
      name: "Budi",
      email: "budi@example.com",
      phone: "081298765432",
      address: "Jl. Sudirman 22",
    },
  ];

  const defaultSettings = {
    storeName: "Dsavee", // fixed
    logo: "",
    contactEmail: "store@example.com",
    contactPhone: "",
    paymentMethods: ["Bank Transfer"],
    shippingCost: 10000,
    instagram: "",
    tiktok: "",
  };

  // ---------- state with localStorage persistence ----------
  const [activeTab, setActiveTab] = useState("overview");

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
      return raw ? JSON.parse(raw) : demoOrders;
    } catch {
      return demoOrders;
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

  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem("admin_settings");
      const s = raw ? JSON.parse(raw) : defaultSettings;
      // ensure storeName always Dsavee
      return { ...defaultSettings, ...s, storeName: "Dsavee" };
    } catch {
      return defaultSettings;
    }
  });

  // persist
  useEffect(() => {
    localStorage.setItem("admin_products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("admin_orders", JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem("admin_users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    // ensure storeName remains Dsavee
    setSettings((s) => ({ ...s, storeName: "Dsavee" }));
    localStorage.setItem(
      "admin_settings",
      JSON.stringify({ ...settings, storeName: "Dsavee" })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.paymentMethods,
    settings.contactEmail,
    settings.contactPhone,
    settings.logo,
    settings.shippingCost,
    settings.instagram,
    settings.tiktok,
  ]);

  // ---------- ACCESS CONTROL: STRICT for single admin email ----------
  const navigate = useNavigate();
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(
      auth,
      async (user) => {
        // If no authenticated user -> redirect to login
        if (!user) {
          navigate("/login", { replace: true });
          return;
        }
        const userEmail = (user.email || "").toLowerCase();
        if (userEmail !== ADMIN_EMAIL.toLowerCase()) {
          try {
            await signOut(auth);
          } catch (e) {}
          alert("Access denied: hanya admin yang boleh mengakses halaman ini.");
          navigate("/", { replace: true });
          return;
        }
        // allowed: admin — do nothing
      },
      (err) => {
        console.error("onAuthStateChanged error:", err);
        alert("Access error. Redirecting.");
        navigate("/", { replace: true });
      }
    );
    return () => {
      if (typeof unsub === "function") unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // ---------- helpers ----------
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

  // ---------- metrics ----------
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => normalizeStatus(o.status) === "delivered")
      .reduce((acc, o) => acc + Number(o.total || 0), 0);
    const pelangganCount = new Set(
      orders.map((o) => o.user_email).filter(Boolean)
    ).size;
    const jumlahProduk = products.length;
    return { totalOrders, totalRevenue, pelangganCount, jumlahProduk };
  }, [orders, products]);

  // ---------- product CRUD ----------
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({
    id: "",
    name: "",
    price: 0,
    stock: 0,
    currency: "IDR",
    description: "",
    image: "",
    badge: "",
    keywords: [],
    sizes: [],
    variants: [],
  });

  function openAddProduct() {
    setEditingProductId(null);
    setProductForm({
      id: `p${Date.now()}`,
      name: "",
      price: 0,
      stock: 0,
      currency: "IDR",
      description: "",
      image: "",
      badge: "",
      keywords: [],
      sizes: [],
      variants: [],
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
      stock: p.stock || 0,
      currency: p.currency || "IDR",
      description: p.description || "",
      image: p.image || "",
      badge: p.badge || "",
      keywords: Array.isArray(p.keywords) ? p.keywords : [],
      sizes: Array.isArray(p.sizes) ? p.sizes : [],
      variants: Array.isArray(p.variants) ? p.variants : [],
    });
    setProductModalOpen(true);
    setActiveTab("products");
  }

  // image read
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

  function saveProduct(e) {
    e.preventDefault();
    const normalized = {
      ...productForm,
      price: Number(productForm.price) || 0,
      stock: Number(productForm.stock) || 0,
      keywords: Array.isArray(productForm.keywords)
        ? productForm.keywords
        : String(productForm.keywords || "")
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
      sizes: Array.isArray(productForm.sizes)
        ? productForm.sizes
        : String(productForm.sizes || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
      variants: Array.isArray(productForm.variants) ? productForm.variants : [],
    };
    if (editingProductId) {
      setProducts((prev) =>
        prev.map((x) => (x.id === editingProductId ? normalized : x))
      );
    } else {
      setProducts((prev) => [normalized, ...prev]);
    }
    setProductModalOpen(false);
    setEditingProductId(null);
  }

  function deleteProduct(id) {
    if (!window.confirm("Hapus produk ini?")) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  // variant helpers
  function addVariant() {
    setProductForm((s) => ({
      ...s,
      variants: [
        ...(s.variants || []),
        { id: `v${Date.now()}`, name: "", stock: 0 },
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

  // ---------- orders ----------
  const [orderSearch, setOrderSearch] = useState("");
  const [orderPage, setOrderPage] = useState(1);
  const ORDERS_PAGE_SIZE = 8;
  const [orderSortDesc, setOrderSortDesc] = useState(true);

  // normalize existing orders statuses on load
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
      // product column removed — do not filter by product
      list = list.filter(
        (o) =>
          (o.order_id || "").toLowerCase().includes(q) ||
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

  function updateOrderStatus(order_id, newStatus) {
    const ns = normalizeStatus(newStatus);
    setOrders((prev) =>
      prev.map((o) =>
        o.order_id === order_id
          ? { ...o, status: ns, updated_at: new Date().toISOString() }
          : o
      )
    );
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
      updated_at: new Date().toISOString(),
      user_email: `user${Math.floor(Math.random() * 100)}@mail.com`,
      user_phone: `0812${Math.floor(10000000 + Math.random() * 89999999)}`,
      payment: Math.random() > 0.5 ? "Crypto" : "Bank Transfer",
      // product fields still exist in data model but NOT shown in table
      product: products.length ? products[0].name : "Unknown product",
      product_id: products.length ? products[0].id : undefined,
      total: Math.random() > 0.5 ? 25000 : 0.02,
      currency: Math.random() > 0.5 ? "IDR" : "ETH",
      status: "pending",
    };
    setOrders((prev) => [newOrder, ...prev]);
    setActiveTab("orders");
  }

  // ---------- view product modal for orders ----------
  const [viewProductModalOpen, setViewProductModalOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null);

  function handleViewOrderProduct(order) {
    // try to find product by product_id, else by name matching
    let found = null;
    if (order.product_id) {
      found = products.find((p) => p.id === order.product_id);
    }
    if (!found && order.product) {
      found = products.find((p) =>
        order.product.toLowerCase().includes(p.name.toLowerCase())
      );
    }
    if (found) {
      setViewingProduct(found);
    } else {
      // fallback show minimal info using the order.product string
      setViewingProduct({
        name: order.product || "Unknown product",
        price: order.total,
        currency: order.currency,
        stock: 0,
        sizes: [],
        description: "",
      });
    }
    setViewProductModalOpen(true);
  }

  // ---------- users ----------
  function deleteUser(uid) {
    if (!window.confirm("Hapus akun pengguna ini?")) return;
    setUsers((prev) => prev.filter((u) => u.uid !== uid));
  }

  // ---------- settings ----------
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
    // storeName is fixed
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

  // change password modal (admin)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  function handleChangePasswordSubmit(e) {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      alert("Password kosong atau tidak cocok.");
      return;
    }
    // demo: just show success
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

  // ---------- reports: sales last 7 days ----------
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
      if (normalizeStatus(o.status) !== "delivered") return;
      const k = String(o.created_at || "").slice(0, 10);
      const idx = days.findIndex((d) => d.key === k);
      if (idx >= 0) days[idx].revenue += Number(o.total || 0);
    });
    return days;
  }, [orders]);

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

      {/* tabs */}
      <ul className="nav nav-tabs mb-4">
        {["overview", "products", "orders", "users", "reports", "settings"].map(
          (t) => (
            <li className="nav-item" key={t}>
              <button
                type="button"
                className={`nav-link ${activeTab === t ? "active" : ""}`}
                onClick={() => setActiveTab(t)}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            </li>
          )
        )}
      </ul>

      {/* content */}
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

        {/* PRODUCTS */}
        {activeTab === "products" && (
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Products</h5>
                <div>
                  <button
                    className="btn btn-sm btn-primary me-2"
                    onClick={openAddProduct}
                  >
                    + New Product
                  </button>
                </div>
              </div>

              {products.length === 0 ? (
                <p className="text-muted">No products available.</p>
              ) : (
                <div className="row">
                  {products.map((p) => (
                    <div className="col-md-6 mb-3" key={p.id}>
                      <div className="card h-100">
                        <div className="card-body">
                          {/* hanya tampilkan name, price, stock, size(s) */}
                          <h6 className="card-title mb-1">{p.name}</h6>
                          <div className="text-muted small">
                            Rp {currencyFormat(p.price, p.currency)}
                          </div>
                          <div className="small text-muted">
                            Stock: {p.stock}
                          </div>
                          <div className="small text-muted">
                            Size:{" "}
                            {Array.isArray(p.sizes) ? p.sizes.join(", ") : "-"}
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
                    placeholder="Search order id / email / amount"
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
                {/* font lebih kecil untuk rapi */}
                <table
                  className="table table-sm align-middle small"
                  style={{ fontSize: "0.85rem" }}
                >
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Created</th>
                      <th>Updated</th>
                      <th>Email</th>
                      <th>Payment</th>
                      {/* Product column intentionally removed */}
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
                        <td>
                          {o.updated_at
                            ? new Date(o.updated_at).toLocaleString()
                            : "-"}
                        </td>
                        <td style={{ maxWidth: 180, wordBreak: "break-word" }}>
                          {o.user_email || "-"}
                        </td>
                        <td>{o.payment || "-"}</td>
                        {/* Product cell removed */}
                        <td>
                          {o.currency}{" "}
                          {currencyFormat(o.total || 0, o.currency || "IDR")}
                        </td>
                        <td>
                          {/* Status is dropdown-only as requested */}
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
                        <td colSpan="8" className="text-center text-muted">
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
              {/* container height increased to avoid "gepeng" look */}
              <div style={{ height: 260 }}>
                <MiniBarChart
                  data={salesLast7Days.map((d) => ({
                    label: d.label,
                    value: d.revenue,
                  }))}
                />
              </div>
              <div className="mt-3 small text-muted">
                Total Pendapatan: Rp{" "}
                {currencyFormat(metrics.totalRevenue, "IDR")}
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Settings</h5>
              <form onSubmit={(e) => e.preventDefault()}>
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
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => window.alert("Settings saved (demo).")}
                      >
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

      {/* ----- Product Modal ----- */}
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
            </div>

            <div className="mb-2">
              <label className="form-label">Image</label>
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
                placeholder="e.g. Best Seller"
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
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={addVariant}
                >
                  + Add Variant
                </button>
              </div>
              {productForm.variants && productForm.variants.length > 0 ? (
                productForm.variants.map((v, idx) => (
                  <div key={v.id} className="d-flex gap-2 mb-2">
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

      {/* View Product Modal (from Orders) */}
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
              {viewingProduct.badge && (
                <div className="mt-2">
                  <span className="badge bg-warning text-dark">
                    {viewingProduct.badge}
                  </span>
                </div>
              )}
              {viewingProduct.keywords &&
                viewingProduct.keywords.length > 0 && (
                  <div className="mt-2 small text-muted">
                    Keywords: {viewingProduct.keywords.join(", ")}
                  </div>
                )}
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

      {/* Change Password Modal (admin) */}
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

function StatCard({ title, value, small }) {
  return (
    <div className="col-md-3">
      <div className="card p-3 h-100">
        <div className="small text-muted">{title}</div>
        <div className="h4">{value}</div>
        {small ? <div className="small text-muted">{small}</div> : null}
      </div>
    </div>
  );
}

function Modal({ children, onClose }) {
  // simple centered modal
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

/* MiniBarChart: adjusted SVG so it doesn't appear "gepeng" */
function MiniBarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  // wider canvas and taller height to keep aspect reasonable
  const w = 700;
  const h = 220;
  const pad = 28;
  const barW = Math.max(12, (w - pad * 2) / data.length - 12);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="0" y="0" width={w} height={h} fill="#ffffff" />
      {/* grid lines */}
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
