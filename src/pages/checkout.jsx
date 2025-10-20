// src/pages/Checkout.jsx
import React, { useState } from "react";
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

export default function Checkout() {
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const { items } = useCartState();
  const dispatch = useCartDispatch();

  // Normalisasi items: pastikan price & qty = number
  const normalizedItems = (items || []).map((it, idx) => ({
    id: it.id ?? `i-${idx}`,
    name: it.name ?? it.title ?? "Produk",
    price: Number(it.price) || 0,
    qty: Number(it.qty) || 1,
    size: it.size ?? "",
    image: it.image ?? null,
  }));

  // total harga (number)
  const total = normalizedItems.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 1),
    0
  );

  // simple wallet validation (ethereum-like)
  const isValidEthAddress = (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!email) return setMessage("Masukkan email.");
    if (!wallet) return setMessage("Masukkan wallet address.");
    if (!isValidEthAddress(wallet)) {
      return setMessage("Wallet address tidak valid (harus mulai 0x).");
    }
    if (!normalizedItems || normalizedItems.length === 0)
      return setMessage("Keranjang kosong.");

    setSubmitting(true);
    setMessage("Menyimpan order...");

    const RECEIVER_WALLET =
      process.env.REACT_APP_RECEIVER_WALLET || "0xFallback...";

    try {
      // buat order dengan items yang sudah dinormalisasi
      const ordersCol = collection(db, "orders");
      const orderData = {
        email,
        wallet, // wallet pembeli
        recipient: RECEIVER_WALLET, // alamat penerima publik
        blockchain: "ethereum",
        token: "eth",
        items: normalizedItems,
        total,
        status: "pending",
        proofName: proofFile ? proofFile.name : null,
        proofUrl: null,
        txId: null,
        createdAt: serverTimestamp(),
      };

      const orderRef = await addDoc(ordersCol, orderData);

      // upload proof jika ada
      let uploadedProofUrl = null;
      if (proofFile && false) {
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
          console.warn("Upload proof failed (continuing):", err);
          setMessage((m) => m + " (Upload bukti gagal, lanjut.)");
        }
      }

      // fake tx id
      const fakeTxId =
        "SIM-" +
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 9);
      await updateDoc(orderRef, { txId: fakeTxId });

      // kosongkan cart di state global
      dispatch({ type: "CLEAR_CART" });

      setMessage(
        "Order tersimpan (pending). Menunggu konfirmasi (simulasi)..."
      );
      setSubmitting(false);
      alert("Checkout sukses (dummy). Order ID: " + orderRef.id);

      // simulasi konfirmasi: ubah status -> confirmed
      setTimeout(async () => {
        try {
          await updateDoc(orderRef, {
            status: "confirmed",
            confirmedAt: serverTimestamp(),
            txHash: "0x" + fakeTxId.replace(/^SIM-/, ""),
          });
          console.info("Order confirmed (simulasi):", orderRef.id);
        } catch (err) {
          console.error("Failed to mark confirmed:", err);
        }
      }, 8000);
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Gagal checkout: " + (err.message || err));
      setSubmitting(false);
      setMessage("Gagal menyimpan order.");
    }
  };

  return (
    <div className="container my-5" style={{ maxWidth: 820 }}>
      <h2>Checkout</h2>

      <div className="row">
        {/* Form */}
        <div className="col-md-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Email pengguna</label>
              <input
                type="email"
                className="form-control"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Wallet address</label>
              <input
                type="text"
                className="form-control"
                required
                placeholder="0x..."
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                disabled={submitting}
              />
              <div className="form-text">
                Harus berformat Ethereum address (0x...)
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Blockchain</label>
              <input
                type="text"
                className="form-control"
                value="ethereum"
                readOnly
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Token</label>
              <input
                type="text"
                className="form-control"
                value="eth"
                readOnly
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Proof of payment (file)</label>
              <input
                type="file"
                className="form-control"
                onChange={(e) => setProofFile(e.target.files[0] || null)}
                disabled={submitting}
              />
              <small className="form-text text-muted">
                Upload bukti opsional. Jika Storage Firebase tersedia, file akan
                diupload.
              </small>
            </div>

            <div className="mb-3">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? "Memproses..." : "Confirm"}
              </button>
            </div>

            {message && <div className="alert alert-info">{message}</div>}
          </form>
        </div>

        {/* Ringkasan order */}
        <div className="col-md-6">
          <div className="card p-3">
            <h5>Ringkasan Pesanan</h5>
            <ul className="list-unstyled">
              {normalizedItems && normalizedItems.length ? (
                normalizedItems.map((it, idx) => (
                  <li
                    key={it.id || idx}
                    className="d-flex justify-content-between py-2 border-bottom"
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{it.name}</div>
                      <small className="text-muted">{it.size || ""}</small>
                      <div className="text-muted">Qty: {it.qty}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700 }}>
                        Rp{(it.price * it.qty).toFixed(2)}
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <li className="text-muted">Keranjang kosong</li>
              )}
            </ul>

            <div className="d-flex justify-content-between mt-3">
              <div>Total</div>
              <div style={{ fontWeight: 800 }}>Rp{total.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
