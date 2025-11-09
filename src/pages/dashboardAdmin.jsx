import React, { useEffect, useMemo, useState } from "react";

/**
 * Admin Dashboard
 * - Tabbed layout: Overview | Products | Orders | Users | Reports | Settings
 * - Product CRUD (name, price, stock, description, image)
 * - Orders management (view, search, pagination, change status, edit tx)
 * - Users list (view, delete)
 * - Simple sales reports (SVG chart + table)
 * - Store settings (logo, name, contact, payment methods, shipping cost)
 *
 * Data is persisted to localStorage (so demo-friendly).
 * Styling uses Bootstrap utility classes to stay visually similar to productDetail/profile pages.
 */

export default function AdminDashboard() {
  // ---------- initial/demo data ----------
  const demoProducts = [
    {
      id: "p1",
      name: "Sticker A",
      price: 20000,
      stock: 50,
      currency: "IDR",
      description: "Sticker A - high quality vinyl",
      image: "",
    },
    {
      id: "p2",
      name: "Sticker B",
      price: 0.01,
      stock: 20,
      currency: "ETH",
      description: "Sticker B - crypto edition",
      image: "",
    },
  ];

  const demoOrders = [
    {
      order_id: "ORD-1001",
      payment_method: "Crypto",
      buyer_wallet: "0xAbC123...",
      total_amount: 20000,
      currency: "IDR",
      tx_hash: "0xabc123validhash",
      status: "Pending",
      created_at: "2025-10-10T09:15:00Z",
      updated_at: "2025-10-10T09:15:00Z",
    },
    {
      order_id: "ORD-1002",
      payment_method: "Crypto",
      buyer_wallet: "0xDef456...",
      total_amount: 0.02,
      currency: "ETH",
      tx_hash: "",
      status: "Failed",
      created_at: "2025-10-12T12:00:00Z",
      updated_at: "2025-10-12T12:30:00Z",
    },
    {
      order_id: "ORD-1003",
      payment_method: "Bank Transfer",
      buyer_wallet: "",
      total_amount: 50000,
      currency: "IDR",
      tx_hash: "",
      status: "Completed",
      created_at: "2025-10-13T08:00:00Z",
      updated_at: "2025-10-14T10:00:00Z",
    },
  ];

  const demoUsers = [
    { uid: "u1", name: "Andi", email: "andi@example.com", role: "customer" },
    { uid: "u2", name: "Budi", email: "budi@example.com", role: "customer" },
  ];

  const defaultSettings = {
    storeName: "My Store",
    logo: "",
    contactEmail: "store@example.com",
    contactPhone: "",
    paymentMethods: ["Bank Transfer"],
    shippingCost: 10000,
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
      return raw ? JSON.parse(raw) : defaultSettings;
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
    localStorage.setItem("admin_settings", JSON.stringify(settings));
  }, [settings]);

  // ---------- metrics ----------
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => o.status === "Completed")
      .reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
    const pelangganCount = new Set(
      orders.map((o) => o.buyer_wallet || o.buyer_email).filter(Boolean)
    ).size;
    const jumlahProduk = products.length;
    return { totalOrders, totalRevenue, pelangganCount, jumlahProduk };
  }, [orders, products]);

  // ---------- products (CRUD) ----------
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    id: "",
    name: "",
    price: "",
    stock: "",
    currency: "IDR",
    description: "",
    image: "",
  });

  function openAddProduct() {
    setEditingProduct(null);
    setProductForm({
      id: `p${Date.now()}`,
      name: "",
      price: "",
      stock: 0,
      currency: "IDR",
      description: "",
      image: "",
    });
    setProductModalOpen(true);
    setActiveTab("products");
  }

  function openEditProduct(p) {
    setEditingProduct(p.id);
    setProductForm({ ...p });
    setProductModalOpen(true);
    setActiveTab("products");
  }

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
      // eslint-disable-next-line no-console
      console.error("Image read error", err);
    }
  }

  function saveProduct(e) {
    e.preventDefault();
    const normalized = {
      ...productForm,
      price: Number(productForm.price) || 0,
      stock: Number(productForm.stock) || 0,
    };
    if (editingProduct) {
      setProducts((prev) =>
        prev.map((x) => (x.id === editingProduct ? normalized : x))
      );
    } else {
      setProducts((prev) => [normalized, ...prev]);
    }
    setProductModalOpen(false);
    setEditingProduct(null);
  }

  function deleteProduct(id) {
    if (!window.confirm("Hapus produk ini?")) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  // ---------- orders ----------
  const [orderSearch, setOrderSearch] = useState("");
  const [orderPage, setOrderPage] = useState(1);
  const ORDERS_PAGE_SIZE = 6;
  const [orderSortDesc, setOrderSortDesc] = useState(true);

  const filteredSortedOrders = useMemo(() => {
    let list = [...orders];
    const q = String(orderSearch || "")
      .trim()
      .toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.order_id.toLowerCase().includes(q) ||
          (o.buyer_wallet || "").toLowerCase().includes(q) ||
          (String(o.total_amount) || "").includes(q)
      );
    }
    list.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
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
    setOrders((prev) =>
      prev.map((o) =>
        o.order_id === order_id
          ? { ...o, status: newStatus, updated_at: new Date().toISOString() }
          : o
      )
    );
  }

  function saveTxHash(order_id, hash) {
    setOrders((prev) =>
      prev.map((o) =>
        o.order_id === order_id
          ? { ...o, tx_hash: hash, updated_at: new Date().toISOString() }
          : o
      )
    );
  }

  function isValidTxHash(hash) {
    if (!hash) return false;
    return (
      typeof hash === "string" && hash.startsWith("0x") && hash.length > 10
    );
  }

  // mock order utility
  function addMockOrder() {
    const id = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      order_id: id,
      payment_method: Math.random() > 0.4 ? "Crypto" : "Bank Transfer",
      buyer_wallet:
        Math.random() > 0.4
          ? `0x${Math.random().toString(16).slice(2, 12)}`
          : `user${Math.floor(Math.random() * 100)}@mail.com`,
      total_amount: Math.random() > 0.5 ? 25000 : 0.02,
      currency: Math.random() > 0.5 ? "IDR" : "ETH",
      tx_hash: "",
      status: "Pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setOrders((prev) => [newOrder, ...prev]);
    setActiveTab("orders");
  }

  // ---------- users ----------
  function deleteUser(uid) {
    if (!window.confirm("Hapus akun pengguna ini?")) return;
    setUsers((prev) => prev.filter((u) => u.uid !== uid));
  }

  // ---------- reports (simple) ----------
  // compute daily revenue for last 7 days (based on created_at & Completed status)
  const salesLast7Days = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
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
      if (o.status !== "Completed") return;
      const k = String(o.created_at).slice(0, 10);
      const idx = days.findIndex((d) => d.key === k);
      if (idx >= 0) {
        days[idx].revenue += Number(o.total_amount || 0);
      }
    });
    return days;
  }, [orders]);

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
    setSettings((s) => ({ ...s, [name]: value }));
  }

  async function handleLogoFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const dataUrl = await handleImageFileToDataUrl(f);
      setSettings((s) => ({ ...s, logo: dataUrl }));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Logo read error", err);
    }
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

            <div className="row g-3">
              <div className="col-md-6">
                <div className="card h-100">
                  <div className="card-body">
                    <h5 className="card-title">Produk Terbaru</h5>
                    {products.length === 0 ? (
                      <p className="text-muted">Belum ada produk.</p>
                    ) : (
                      <ul className="list-group list-group-flush">
                        {products.slice(0, 5).map((p) => (
                          <li
                            key={p.id}
                            className="list-group-item d-flex align-items-center justify-content-between"
                          >
                            <div className="d-flex align-items-center">
                              <img
                                src={p.image || "/images/placeholder.png"}
                                alt={p.name}
                                style={{
                                  width: 56,
                                  height: 56,
                                  objectFit: "cover",
                                  borderRadius: 8,
                                }}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src =
                                    "/images/placeholder.png";
                                }}
                              />
                              <div className="ms-3">
                                <div className="fw-semibold">{p.name}</div>
                                <div className="text-muted small">
                                  {p.currency} {String(p.price)}
                                </div>
                              </div>
                            </div>
                            <div className="text-end">
                              <small className="text-muted d-block">
                                Stock {p.stock}
                              </small>
                              <button
                                className="btn btn-sm btn-outline-primary mt-1"
                                onClick={() => openEditProduct(p)}
                              >
                                Edit
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card h-100">
                  <div className="card-body">
                    <h5 className="card-title">Pendapatan 7 Hari Terakhir</h5>
                    <div style={{ height: 140 }}>
                      <MiniBarChart
                        data={salesLast7Days.map((d) => ({
                          label: d.label,
                          value: d.revenue,
                        }))}
                      />
                    </div>
                    <div className="mt-3 small text-muted">
                      Total Completed Revenue: Rp{" "}
                      {currencyFormat(metrics.totalRevenue, "IDR")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS */}
        {activeTab === "products" && (
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Product Management</h5>
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
                        <div className="row g-0">
                          <div className="col-4">
                            <img
                              src={p.image || "/images/placeholder.png"}
                              alt={p.name}
                              className="img-fluid h-100 w-100"
                              style={{ objectFit: "cover" }}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "/images/placeholder.png";
                              }}
                            />
                          </div>
                          <div className="col-8">
                            <div className="card-body">
                              <h6 className="card-title mb-1">{p.name}</h6>
                              <div className="text-muted small">
                                Rp {currencyFormat(p.price, p.currency)}
                              </div>
                              <div className="small text-muted">
                                Stock: {p.stock}
                              </div>
                              <p
                                className="small mt-2 text-truncate"
                                style={{ maxHeight: 36 }}
                              >
                                {p.description}
                              </p>
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
                    placeholder="Search order id / wallet / amount"
                    value={orderSearch}
                    onChange={(e) => {
                      setOrderSearch(e.target.value);
                      setOrderPage(1);
                    }}
                    className="form-control form-control-sm me-2"
                    style={{ minWidth: 260 }}
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
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Payment</th>
                      <th>Buyer</th>
                      <th>Amount</th>
                      <th>Tx Hash</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Updated</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedOrders.map((o) => (
                      <tr key={o.order_id}>
                        <td className="fw-semibold">{o.order_id}</td>
                        <td>{o.payment_method}</td>
                        <td style={{ maxWidth: 140, wordBreak: "break-word" }}>
                          {o.buyer_wallet || "-"}
                        </td>
                        <td>
                          {o.currency}{" "}
                          {currencyFormat(o.total_amount, o.currency)}
                        </td>
                        <td style={{ maxWidth: 200, wordBreak: "break-word" }}>
                          {o.tx_hash || "-"}
                          {!isValidTxHash(o.tx_hash) &&
                            o.payment_method === "Crypto" && (
                              <div className="small text-danger">
                                Invalid/empty hash
                              </div>
                            )}
                        </td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={o.status}
                            onChange={(e) =>
                              updateOrderStatus(o.order_id, e.target.value)
                            }
                          >
                            {[
                              "Pending",
                              "Processing",
                              "Failed",
                              "Cancelled",
                              "Completed",
                              "Shipped",
                            ].map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>{new Date(o.created_at).toLocaleString()}</td>
                        <td>{new Date(o.updated_at).toLocaleString()}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <EditTxInline
                              order={o}
                              onSave={(hash) => saveTxHash(o.order_id, hash)}
                            />
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => {
                                if (!window.confirm("Cancel this order?"))
                                  return;
                                updateOrderStatus(o.order_id, "Cancelled");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pagedOrders.length === 0 && (
                      <tr>
                        <td colSpan="9" className="text-center text-muted">
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
              <p className="text-muted small">Daftar pelanggan terdaftar</p>

              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.uid}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
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
                        <td colSpan="4" className="text-center text-muted">
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
              <h5 className="card-title">Sales Reports</h5>
              <p className="text-muted small">
                Ringkasan pendapatan berdasarkan pesanan yang selesai
              </p>

              <div className="row">
                <div className="col-md-8">
                  <div style={{ height: 220 }}>
                    <MiniBarChart
                      data={salesLast7Days.map((d) => ({
                        label: d.label,
                        value: d.revenue,
                      }))}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card">
                    <div className="card-body">
                      <h6 className="mb-2">Summary</h6>
                      <div className="small text-muted">
                        Total Completed Revenue
                      </div>
                      <div className="h5">
                        Rp {currencyFormat(metrics.totalRevenue, "IDR")}
                      </div>
                      <hr />
                      <div className="small text-muted">Total Orders</div>
                      <div className="h6">{metrics.totalOrders}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <h6 className="mb-2">Recent Completed Transactions</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Amount</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders
                        .filter((o) => o.status === "Completed")
                        .slice(0, 6)
                        .map((o) => (
                          <tr key={o.order_id}>
                            <td>{o.order_id}</td>
                            <td>
                              Rp {currencyFormat(o.total_amount, o.currency)}
                            </td>
                            <td>{new Date(o.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      {orders.filter((o) => o.status === "Completed").length ===
                        0 && (
                        <tr>
                          <td colSpan="3" className="text-center text-muted">
                            No completed transactions
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Store Settings</h5>
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="row">
                  <div className="col-md-4">
                    <label className="form-label">Store Logo</label>
                    <div className="mb-2">
                      <img
                        src={settings.logo || "/images/placeholder.png"}
                        alt="logo"
                        style={{
                          width: 120,
                          height: 120,
                          objectFit: "cover",
                          borderRadius: 8,
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
                      onChange={handleLogoFile}
                      className="form-control form-control-sm"
                    />
                  </div>

                  <div className="col-md-8">
                    <div className="mb-2">
                      <label className="form-label">Store Name</label>
                      <input
                        name="storeName"
                        value={settings.storeName}
                        onChange={handleSettingsChange}
                        className="form-control"
                      />
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-2">
                        <label className="form-label">Contact Email</label>
                        <input
                          name="contactEmail"
                          value={settings.contactEmail}
                          onChange={handleSettingsChange}
                          className="form-control"
                        />
                      </div>
                      <div className="col-md-6 mb-2">
                        <label className="form-label">Contact Phone</label>
                        <input
                          name="contactPhone"
                          value={settings.contactPhone}
                          onChange={handleSettingsChange}
                          className="form-control"
                        />
                      </div>
                    </div>

                    <div className="mb-2">
                      <label className="form-label">Payment Methods</label>
                      <div>
                        {["Cash on Delivery", "Midtrans"].map((pm) => (
                          <div
                            className="form-check form-check-inline"
                            key={pm}
                          >
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`pm-${pm}`}
                              name="paymentMethods"
                              value={pm}
                              checked={settings.paymentMethods.includes(pm)}
                              onChange={handleSettingsChange}
                            />
                            <label
                              className="form-check-label"
                              htmlFor={`pm-${pm}`}
                            >
                              {pm}
                            </label>
                          </div>
                        ))}
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

                    <div className="mt-3">
                      <button
                        type="button"
                        className="btn btn-primary me-2"
                        onClick={() => {
                          window.alert("Settings saved");
                        }}
                      >
                        Save Settings
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
            setEditingProduct(null);
          }}
        >
          <h5>{editingProduct ? "Edit Product" : "Add Product"}</h5>
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
              <div className="col-md-4 mb-2">
                <label className="form-label">Currency</label>
                <select
                  className="form-select"
                  value={productForm.currency}
                  onChange={(e) =>
                    setProductForm((s) => ({ ...s, currency: e.target.value }))
                  }
                >
                  <option>IDR</option>
                  <option>ETH</option>
                </select>
              </div>
            </div>

            <div className="mb-2">
              <label className="form-label">Description</label>
              <textarea
                rows="3"
                className="form-control"
                value={productForm.description}
                onChange={(e) =>
                  setProductForm((s) => ({ ...s, description: e.target.value }))
                }
              />
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

            <div className="d-flex justify-content-end gap-2 mt-3">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  setProductModalOpen(false);
                  setEditingProduct(null);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingProduct ? "Save changes" : "Create product"}
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

function EditTxInline({ order, onSave }) {
  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState(order.tx_hash || "");

  useEffect(() => {
    setHash(order.tx_hash || "");
  }, [order.tx_hash]);

  return (
    <div style={{ position: "relative" }}>
      <button
        className="btn btn-sm btn-outline-secondary"
        onClick={() => setOpen((s) => !s)}
      >
        Edit Tx
      </button>
      {open && (
        <div
          className="card p-2"
          style={{
            position: "absolute",
            right: 0,
            top: "110%",
            zIndex: 50,
            width: 320,
          }}
        >
          <div className="mb-2">
            <label className="form-label small">Tx Hash</label>
            <input
              className="form-control form-control-sm"
              value={hash}
              onChange={(e) => setHash(e.target.value)}
            />
            {!isValidTxInline(hash) && order.payment_method === "Crypto" && (
              <div className="small text-danger mt-1">Hash tidak valid</div>
            )}
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setOpen(false);
                setHash(order.tx_hash || "");
              }}
            >
              Cancel
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                onSave(hash);
                setOpen(false);
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function isValidTxInline(hash) {
  return !!(
    hash &&
    typeof hash === "string" &&
    hash.startsWith("0x") &&
    hash.length > 10
  );
}

/* MiniBarChart: simple SVG bar chart for small dashboards */
function MiniBarChart({ data }) {
  // data: [{label, value}]
  const max = Math.max(...data.map((d) => d.value), 1);
  const w = 420;
  const h = 120;
  const pad = 20;
  const barW = (w - pad * 2) / data.length - 8;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
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
        const x = pad + i * (barW + 8);
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
              y={h - pad + 12}
              fontSize="9"
              textAnchor="middle"
              fill="#666"
            >
              {d.label}
            </text>
            <text
              x={x + barW / 2}
              y={y - 4}
              fontSize="9"
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
