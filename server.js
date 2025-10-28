import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import "dotenv/config";

const app = express();
app.use(express.json());
app.use(cors());

// Konfigurasi lewat environment
const MIDTRANS_SERVER_KEY =
  process.env.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_BASE =
  process.env.MIDTRANS_BASE || "https://app.sandbox.midtrans.com";

app.post("/api/create-midtrans", async (req, res) => {
  try {
    const url = `${MIDTRANS_BASE}/snap/v1/transactions`;
    console.log("[proxy] create midtrans tx ->", url, "payload:", req.body);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization:
          "Basic " + Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString("base64"),
      },
      body: JSON.stringify(req.body),
      // note: node-fetch v3 doesn't support timeout option directly; use AbortController if needed
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("[proxy] midtrans returned non-ok:", response.status, data);
      return res.status(502).json({ error: "Midtrans error", details: data });
    }

    if (!data || !data.token) {
      console.warn("[proxy] midtrans response missing token:", data);
      return res.status(502).json({
        error: "Midtrans response invalid (no token)",
        details: data,
      });
    }

    // Log full response server-side (untuk debugging). Jangan kirim semua ke client di production.
    console.log("[proxy] midtrans success, token:", data.token);

    // Kembalikan hanya token ke client (aman)
    return res.status(200).json({ token: data.token });
  } catch (error) {
    console.error("[proxy] create-midtrans error:", error);
    return res.status(500).json({ error: error.message || "Internal error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Midtrans Proxy berjalan di http://localhost:${PORT}`);
});
