import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function Profile() {
  // contoh static — integrasikan auth untuk email user
  const [history, setHistory] = useState([
    {
      id: "o1",
      product: "Sunstar Melon",
      qty: 1,
      date: "2023-07-10",
      status: "delivered",
    },
  ]);

  // jika ingin fetch orders: gunakan firestore query berdasarkan user
  useEffect(() => {
    // contoh: fetch order by user (memerlukan auth)
  }, []);

  return (
    <div className="container my-5">
      <h2>Profile</h2>
      <p>
        <strong>Name:</strong> Nama Pengguna
      </p>
      <p>
        <strong>Email:</strong> user@example.com
      </p>

      <h4>History of purchase</h4>
      <table className="table">
        <thead>
          <tr>
            <th>Produk</th>
            <th>Jumlah</th>
            <th>Tanggal</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.id}>
              <td>{h.product}</td>
              <td>{h.qty}</td>
              <td>{h.date}</td>
              <td>{h.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
