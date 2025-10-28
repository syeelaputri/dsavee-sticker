import React, { useState } from "react";
import { Link } from "react-router-dom";

const OrderHistory = () => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofImage, setProofImage] = useState("");

  // Sample data untuk tampilan UI
  const orders = [
    {
      id: "ORD-001",
      items: [
        {
          name: "Flower Sticker Pack",
          price: 25000,
          quantity: 2,
          color: "Pink",
        },
        {
          name: "Character  ",
          price: 15000,
          quantity: 1,
          color: "Blue",
        },
        {
          name: "Character Sticker ",
          price: 15000,
          quantity: 1,
          color: "Blue",
        },
        {
          name: "Character Sticker ",
          price: 15000,
          quantity: 1,
          color: "Blue",
        },
        {
          name: "Character Sticker ",
          price: 15000,
          quantity: 1,
          color: "Blue",
        },
      ],
      totalAmount: 65000,
      paymentMethod: "Bank Transfer",
      status: "completed",
      createdAt: new Date("2024-01-15"),
      shippingAddress: "Jl. Contoh No. 123, Airmadidi",
    },
    {
      id: "ORD-002",
      items: [
        {
          name: "Aesthetic Quote Stickers",
          price: 20000,
          quantity: 3,
          color: "Black",
        },
      ],
      totalAmount: 60000,
      paymentMethod: "E-wallet",
      status: "processing",
      createdAt: new Date("2024-01-18"),
      shippingAddress: "Jl. Contoh No. 123, Airmadidi",
    },
    {
      id: "ORD-003",
      items: [
        {
          name: "Kawaii Animal Stickers",
          price: 30000,
          quantity: 1,
          color: "Yellow",
        },
      ],
      totalAmount: 30000,
      paymentMethod: "Crypto Payment",
      status: "pending",
      createdAt: new Date("2024-01-20"),
      shippingAddress: "Jl. Contoh No. 123, Airmadidi",
    },
  ];

  // Styles
  const styles = {
    container: {
      minHeight: "100vh",
      padding: "2rem 0",
    },
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
    tableHeader: {
      backgroundColor: "#343a40",
      color: "white",
    },
    badge: {
      fontSize: "0.75rem",
      padding: "0.5rem 0.75rem",
    },
    emptyState: {
      padding: "60px 20px",
      textAlign: "center",
    },
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
    modalBody: {
      padding: "1.5rem",
    },
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
    tableHover: {
      transition: "background-color 0.2s ease",
    },
  };

  // Media query styles
  const mediaQueryStyles = `
    @media (max-width: 768px) {
      .table-responsive {
        font-size: 0.875rem;
      }
      
      .btn-sm {
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
      }
      
      .modal-content {
        margin: 1rem;
        max-width: 95%;
      }
      
      .header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }
    }

    @media (max-width: 576px) {
      .table th, .table td {
        padding: 0.5rem;
      }
      
      .btn-group {
        flex-direction: column;
        gap: 0.25rem;
      }
    }

    /* Hover effects */
    .table-hover tbody tr:hover {
      background-color: rgba(0,123,255,0.05) !important;
    }

    .btn-outline-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }

    .btn:hover {
      transform: translateY(-1px);
      transition: all 0.2s ease;
    }
  `;

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        style: { backgroundColor: "#ffc107", color: "black" },
        text: "Pending",
      },
      processing: {
        style: { backgroundColor: "#0dcaf0", color: "white" },
        text: "Processing",
      },
      completed: {
        style: { backgroundColor: "#198754", color: "white" },
        text: "Completed",
      },
      failed: {
        style: { backgroundColor: "#dc3545", color: "white" },
        text: "Failed",
      },
      cancelled: {
        style: { backgroundColor: "#6c757d", color: "white" },
        text: "Cancelled",
      },
    };

    const config = statusConfig[status.toLowerCase()] || statusConfig.pending;
    return (
      <span style={{ ...styles.badge, ...config.style }} className="badge">
        {config.text}
      </span>
    );
  };

  const getStatusDescription = (status) => {
    const descriptions = {
      pending: "Pesanan sudah dibuat, menunggu pembayaran",
      processing: "Pembayaran diterima, pesanan sedang disiapkan",
      completed: "Barang sudah diterima, transaksi selesai",
      failed: "Pembayaran gagal atau waktu bayar habis",
      cancelled: "Pesanan dibatalkan",
    };
    return descriptions[status.toLowerCase()] || "Status tidak diketahui";
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
  };

  const handleCloseDetails = () => {
    setSelectedOrder(null);
  };

  const handleCloseProofModal = () => {
    setShowProofModal(false);
    setProofImage("");
  };

  const handleSubmitProof = (orderId) => {
    // Simpan proof of payment (placeholder function)
    console.log("Submitting proof for order:", orderId, proofImage);
    alert("Proof of payment submitted successfully!");
    setShowProofModal(false);
    setProofImage("");
  };

  const needsProofOfPayment = (paymentMethod) => {
    return ["Bank Transfer", "E-wallet", "Crypto Payment"].includes(
      paymentMethod
    );
  };

  return (
    <div style={styles.container}>
      {/* Inject CSS media queries and hover effects */}
      <style>{mediaQueryStyles}</style>

      <div className="container">
        <div className="row">
          <div className="col-12">
            <div style={styles.header} className="header">
              <h2>Riwayat Pesanan</h2>
              <span className="text-muted">{orders.length} pesanan</span>
            </div>

            {/* Demo Notice */}
            <div className="alert alert-info mb-4">
              <strong>Demo Mode:</strong> Menampilkan sample data order history.
              <Link to="/login" className="alert-link ms-1">
                Login
              </Link>{" "}
              untuk mengakses fitur lengkap.
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
                          <th>Total Amount</th>
                          <th>Status</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr key={order.id} style={styles.tableHover}>
                            <td>
                              <strong>{order.id}</strong>
                            </td>
                            <td>{formatDate(order.createdAt)}</td>
                            <td>{order.paymentMethod}</td>
                            <td>
                              <strong>{formatPrice(order.totalAmount)}</strong>
                            </td>
                            <td>
                              {getStatusBadge(order.status)}
                              <small className="d-block text-muted">
                                {getStatusDescription(order.status)}
                              </small>
                            </td>
                            <td>
                              <div className="btn-group">
                                <button
                                  className="btn btn-sm btn-outline-primary me-2"
                                  onClick={() => handleViewDetails(order)}
                                >
                                  <i className="fas fa-eye me-1"></i>
                                  Detail
                                </button>
                                {needsProofOfPayment(order.paymentMethod) &&
                                  order.status === "pending" && (
                                    <button
                                      className="btn btn-sm btn-outline-warning"
                                      onClick={() => {
                                        setSelectedOrder(order);
                                        setShowProofModal(true);
                                      }}
                                    >
                                      <i className="fas fa-upload me-1"></i>
                                      Upload Proof
                                    </button>
                                  )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: "800px" }}>
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
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Status:</strong>{" "}
                  {getStatusBadge(selectedOrder.status)}
                  <p className="text-muted mb-0">
                    {getStatusDescription(selectedOrder.status)}
                  </p>
                </div>
                <div className="col-md-6">
                  <strong>Tanggal Pesanan:</strong>
                  <br />
                  {formatDate(selectedOrder.createdAt)}
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Metode Pembayaran:</strong>
                  <br />
                  {selectedOrder.paymentMethod}
                </div>
                <div className="col-md-6">
                  <strong>Total Amount:</strong>
                  <br />
                  {formatPrice(selectedOrder.totalAmount)}
                </div>
              </div>

              {selectedOrder.shippingAddress && (
                <div className="row mb-3">
                  <div className="col-12">
                    <strong>Alamat Pengiriman:</strong>
                    <br />
                    {selectedOrder.shippingAddress}
                  </div>
                </div>
              )}

              <h6 className="mt-4 mb-3">Items:</h6>
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th>Warna</th>
                      <th>Qty</th>
                      <th>Harga</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>
                          {item.color && (
                            <span
                              style={{
                                ...styles.colorBadge,
                                backgroundColor: item.color.toLowerCase(),
                              }}
                            >
                              {item.color}
                            </span>
                          )}
                        </td>
                        <td>{item.quantity}</td>
                        <td>{formatPrice(item.price)}</td>
                        <td>{formatPrice(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="4" className="text-end">
                        <strong>Total:</strong>
                      </td>
                      <td>
                        <strong>
                          {formatPrice(selectedOrder.totalAmount)}
                        </strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseDetails}
              >
                Tutup
              </button>
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
