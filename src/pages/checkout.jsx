import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useCartState, useCartDispatch } from "../contexts/index";

export default function Checkout() {
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { items } = useCartState();
  const dispatch = useCartDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // contoh menyimpan order ke Firestore
      await addDoc(collection(db, "orders"), {
        email,
        wallet,
        blockchain: "ethereum",
        token: "eth",
        items,
        createdAt: serverTimestamp(),
        // proof handling (file) memerlukan storage; di sini hanya metadata
      });

      dispatch({ type: "CLEAR_CART" });
      alert("Checkout sukses (dummy).");
    } catch (err) {
      console.error(err);
      alert("Gagal checkout");
    }
    setSubmitting(false);
  };

  return (
    <div className="container my-5">
      <h2>Checkout</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Email pengguna</label>
          <input
            type="email"
            className="form-control"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Wallet address</label>
          <input
            type="text"
            className="form-control"
            required
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
          />
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
          <input type="text" className="form-control" value="eth" readOnly />
        </div>

        <div className="mb-3">
          <label className="form-label">Proof of payment (file)</label>
          <input
            type="file"
            className="form-control"
            onChange={(e) => setProofFile(e.target.files[0])}
          />
          <small className="form-text text-muted">
            Anda bisa upload bukti; integrasi storage firebase belum termasuk di
            sini.
          </small>
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          Confirm
        </button>
      </form>
    </div>
  );
}
