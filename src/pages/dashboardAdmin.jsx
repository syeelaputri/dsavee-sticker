/* eslint-disable no-restricted-globals */

import React, { useEffect, useMemo, useState } from "react";

export default function AdminDashboard() {
  // ----- mock initial data -----
  const initialProducts = [
    { id: "p1", name: "Sticker A", price: 20000, stock: 50, currency: "IDR" },
    { id: "p2", name: "Sticker B", price: 0.01, stock: 20, currency: "ETH" },
  ];

  const initialOrders = [
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

  // ----- state -----
  const [products, setProducts] = useState(() => {
    try {
      const raw = localStorage.getItem("dsavee_products");
      return raw ? JSON.parse(raw) : initialProducts;
    } catch {
      return initialProducts;
    }
  });
  const [orders, setOrders] = useState(() => {
    try {
      const raw = localStorage.getItem("dsavee_orders");
      return raw ? JSON.parse(raw) : initialOrders;
    } catch {
      return initialOrders;
    }
  });

  // Product CRUD state
  const [isProductModalOpen, setProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({
    id: "",
    name: "",
    price: "",
    stock: "",
    currency: "IDR",
  });

  // Orders UI state
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [sortDesc, setSortDesc] = useState(true);
  const [searchOrderId, setSearchOrderId] = useState("");

  // persist state to localStorage
  useEffect(() => {
    localStorage.setItem("dsavee_products", JSON.stringify(products));
  }, [products]);
  useEffect(() => {
    localStorage.setItem("dsavee_orders", JSON.stringify(orders));
  }, [orders]);

  // metrics
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter((o) => o.status === "Completed")
      .reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
    const jumlahPelanggan = new Set(
      orders.map((o) => o.buyer_wallet).filter(Boolean)
    ).size;
    const jumlahProduk = products.length;
    return { totalOrders, totalRevenue, jumlahPelanggan, jumlahProduk };
  }, [orders, products]);

  // product handlers
  function openAddProduct() {
    setEditingProductId(null);
    setProductForm({
      id: `p${Date.now()}`,
      name: "",
      price: "",
      stock: "",
      currency: "IDR",
    });
    setProductModalOpen(true);
  }
  function openEditProduct(p) {
    setEditingProductId(p.id);
    setProductForm({ ...p });
    setProductModalOpen(true);
  }
  function saveProduct(e) {
    e.preventDefault();
    const form = {
      ...productForm,
      price: Number(productForm.price),
      stock: Number(productForm.stock),
    };
    if (editingProductId) {
      setProducts((prev) =>
        prev.map((x) => (x.id === editingProductId ? form : x))
      );
    } else {
      setProducts((prev) => [form, ...prev]);
    }
    setProductModalOpen(false);
  }
  function deleteProduct(id) {
    if (!confirm("Hapus produk ini?")) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  // orders helpers
  function updateOrderStatus(order_id, newStatus) {
    setOrders((prev) =>
      prev.map((o) =>
        o.order_id === order_id
          ? { ...o, status: newStatus, updated_at: new Date().toISOString() }
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

  // search, sort, paginate
  const filteredSortedOrders = useMemo(() => {
    let list = [...orders];
    if (searchOrderId.trim()) {
      const q = searchOrderId.trim().toLowerCase();
      list = list.filter((o) => o.order_id.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sortDesc ? tb - ta : ta - tb;
    });
    return list;
  }, [orders, searchOrderId, sortDesc]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSortedOrders.length / pageSize)
  );
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages]);
  const pagedOrders = filteredSortedOrders.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // mock order (for testing)
  function addMockOrder() {
    const id = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      order_id: id,
      payment_method: Math.random() > 0.4 ? "Crypto" : "Bank Transfer",
      buyer_wallet:
        Math.random() > 0.4
          ? `0x${Math.random().toString(16).slice(2, 12)}`
          : "",
      total_amount: Math.random() > 0.5 ? 25000 : 0.02,
      currency: Math.random() > 0.5 ? "IDR" : "ETH",
      tx_hash: "",
      status: "Pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setOrders((prev) => [newOrder, ...prev]);
  }

  // Edit tx hash save
  function saveTxHash(order_id, hash) {
    setOrders((prev) =>
      prev.map((o) =>
        o.order_id === order_id
          ? { ...o, tx_hash: hash, updated_at: new Date().toISOString() }
          : o
      )
    );
  }

  // ----- UI -----
  return (
    <div className="bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold">Dashboard Admin</h2>
            <div className="text-sm text-gray-500">
              Overview — produk & pesanan
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openAddProduct}
              className="px-3 py-2 bg-indigo-600 text-white rounded"
            >
              + Add Product
            </button>
            <button
              onClick={addMockOrder}
              className="px-3 py-2 bg-emerald-600 text-white rounded"
            >
              + Mock Order
            </button>
          </div>
        </div>

        {/* metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card title="Total Pesanan">
            <div className="text-2xl font-bold">{metrics.totalOrders}</div>
          </Card>
          <Card title="Total Pendapatan">
            <div className="text-2xl font-bold">
              {metrics.totalRevenue.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">(sum for Completed)</div>
          </Card>
          <Card title="Jumlah Pelanggan">
            <div className="text-2xl font-bold">{metrics.jumlahPelanggan}</div>
          </Card>
          <Card title="Jumlah Produk">
            <div className="text-2xl font-bold">{metrics.jumlahProduk}</div>
          </Card>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* products */}
          <div className="lg:col-span-1 bg-white p-4 rounded shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Products</h3>
            </div>
            <div className="space-y-3">
              {products.length === 0 && (
                <div className="text-sm text-gray-500">No products yet</div>
              )}
              {products.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between border rounded p-2"
                >
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-500">
                      {p.currency} {String(p.price)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Stock: {p.stock}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditProduct(p)}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="px-2 py-1 border rounded text-sm text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* orders table */}
          <div className="lg:col-span-2 bg-white p-4 rounded shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Orders</h3>
              <div className="flex items-center gap-2">
                <input
                  placeholder="Search by order_id"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                />
                <button
                  onClick={() => setSortDesc((s) => !s)}
                  className="px-2 py-1 border rounded text-sm"
                >
                  Sort: {sortDesc ? "Newest" : "Oldest"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="p-2">Order ID</th>
                    <th className="p-2">Payment</th>
                    <th className="p-2">Buyer Wallet</th>
                    <th className="p-2">Amount</th>
                    <th className="p-2">Currency</th>
                    <th className="p-2">Tx Hash</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Created</th>
                    <th className="p-2">Updated</th>
                    <th className="p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedOrders.map((o) => (
                    <tr key={o.order_id} className="border-t">
                      <td className="p-2 font-medium">{o.order_id}</td>
                      <td className="p-2">{o.payment_method}</td>
                      <td className="p-2">{o.buyer_wallet || "-"}</td>
                      <td className="p-2">{o.total_amount}</td>
                      <td className="p-2">{o.currency}</td>
                      <td className="p-2">
                        {o.tx_hash || "-"}
                        {!isValidTxHash(o.tx_hash) &&
                          o.payment_method === "Crypto" && (
                            <div className="text-xs text-red-600">
                              Invalid/empty hash
                            </div>
                          )}
                      </td>
                      <td className="p-2">{o.status}</td>
                      <td className="p-2">
                        {new Date(o.created_at).toLocaleString()}
                      </td>
                      <td className="p-2">
                        {new Date(o.updated_at).toLocaleString()}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          {o.status !== "Completed" && (
                            <button
                              onClick={() =>
                                updateOrderStatus(o.order_id, "Completed")
                              }
                              className="px-2 py-1 border rounded text-xs"
                            >
                              Mark Complete
                            </button>
                          )}
                          {o.status !== "Cancelled" && (
                            <button
                              onClick={() =>
                                updateOrderStatus(o.order_id, "Cancelled")
                              }
                              className="px-2 py-1 border rounded text-xs text-red-600"
                            >
                              Cancel
                            </button>
                          )}
                          <EditTxButton
                            order={o}
                            onSave={(hash) => saveTxHash(o.order_id, hash)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* pagination */}
            <div className="flex items-center justify-between mt-3">
              <div className="text-sm text-gray-600">
                Showing {filteredSortedOrders.length} orders
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 border rounded"
                >
                  Prev
                </button>
                <div className="px-2 py-1 border rounded">
                  {page} / {totalPages}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 border rounded"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* product modal */}
        {isProductModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded w-full max-w-md">
              <h3 className="font-semibold mb-2">
                {editingProductId ? "Edit Product" : "Add Product"}
              </h3>
              <form onSubmit={saveProduct} className="space-y-2">
                <div>
                  <label className="text-sm block">Name</label>
                  <input
                    required
                    value={productForm.name}
                    onChange={(e) =>
                      setProductForm((s) => ({ ...s, name: e.target.value }))
                    }
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm block">Price</label>
                    <input
                      required
                      type="number"
                      value={productForm.price}
                      onChange={(e) =>
                        setProductForm((s) => ({ ...s, price: e.target.value }))
                      }
                      className="w-full border rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm block">Stock</label>
                    <input
                      required
                      type="number"
                      value={productForm.stock}
                      onChange={(e) =>
                        setProductForm((s) => ({ ...s, stock: e.target.value }))
                      }
                      className="w-full border rounded px-2 py-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm block">Currency</label>
                  <select
                    value={productForm.currency}
                    onChange={(e) =>
                      setProductForm((s) => ({
                        ...s,
                        currency: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-2 py-1"
                  >
                    <option>IDR</option>
                    <option>ETH</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setProductModalOpen(false)}
                    className="px-3 py-1 border rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-indigo-600 text-white rounded"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* small subcomponents */
function Card({ title, children }) {
  return (
    <div className="bg-white p-4 rounded shadow flex flex-col justify-between">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function EditTxButton({ order, onSave }) {
  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState(order.tx_hash || "");

  useEffect(() => setHash(order.tx_hash || ""), [order.tx_hash]);

  return (
    <div className="relative">
      <button
        className="px-2 py-1 border rounded text-xs"
        onClick={() => setOpen((s) => !s)}
      >
        Edit Tx
      </button>
      {open && (
        <div className="absolute right-0 mt-2 bg-white border rounded p-2 text-sm w-72 z-50">
          <div>
            <label className="text-xs">Tx Hash</label>
            <input
              value={hash}
              onChange={(e) => setHash(e.target.value)}
              className="w-full border rounded px-2 py-1 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setOpen(false);
                setHash(order.tx_hash || "");
              }}
              className="px-2 py-1 border rounded text-xs"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSave(hash);
                setOpen(false);
              }}
              className="px-2 py-1 bg-indigo-600 text-white rounded text-xs"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
