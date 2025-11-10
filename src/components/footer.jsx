import React, { useEffect, useState } from "react";
import "../css/style.css"; // pastikan path ini benar
import { getDatabase, ref as dbRef, onValue } from "firebase/database";

export default function Footer() {
  const address =
    "Universitas Klabat, Airmadidi Atas, Kec. Airmadidi, Manado, Sulawesi Utara 95371";

  // contact state read from /contact
  const [contact, setContact] = useState({
    phone: "+62 812 3456 7890",
    email: "dsaveesticker@gmail.com",
    instagram: "dsavee",
    tiktok: "dsavee",
  });

  useEffect(() => {
    let db;
    try {
      db = getDatabase();
    } catch (err) {
      console.warn("Firebase not initialized (footer):", err);
      return;
    }
    const cRef = dbRef(db, "contact");
    const unsub = onValue(
      cRef,
      (snap) => {
        const v = snap.val();
        if (!v) return;
        setContact((prev) => ({
          phone: typeof v.phone === "string" ? v.phone : prev.phone,
          email: typeof v.email === "string" ? v.email : prev.email,
          instagram:
            typeof v.instagram === "string" ? v.instagram : prev.instagram,
          tiktok: typeof v.tiktok === "string" ? v.tiktok : prev.tiktok,
        }));
      },
      (err) => {
        console.error("contact onValue err (footer):", err);
      }
    );
    return () => {
      try {
        if (typeof unsub === "function") unsub();
      } catch {}
    };
  }, []);

  const phone = contact.phone || "+62 812 3456 7890";
  const phoneSanitized = String(phone).replace(/[^+\d]/g, ""); // tel:
  const email = contact.email || "dsaveesticker@gmail.com";

  function buildInstagramUrl(inst) {
    if (!inst) return "https://instagram.com";
    const s = inst.trim();
    if (s.startsWith("http")) return s;
    const username = s.startsWith("@") ? s.slice(1) : s;
    return `https://instagram.com/${username}`;
  }
  function buildTiktokUrl(tk) {
    if (!tk) return "https://www.tiktok.com";
    const s = tk.trim();
    if (s.startsWith("http")) return s;
    const username = s.startsWith("@") ? s.slice(1) : s;
    return `https://www.tiktok.com/@${username}`;
  }

  return (
    <footer className="site-footer">
      <div className="container py-5">
        <div className="row gy-4">
          {/* Brand / Contact */}
          <div className="col-md-5">
            <h5 className="brand">Dsavee</h5>
            <p className="mb-2 contact-address">{address}</p>

            <p className="mb-1 contact-item">
              <strong>Phone: </strong>
              <a
                href={`tel:${phoneSanitized}`}
                aria-label="Call Dsavee"
                className="contact-link"
              >
                {phone}
              </a>
            </p>

            <p className="mb-0 contact-item">
              <strong>Email: </strong>
              <a
                href={`mailto:${email}`}
                aria-label="Email Dsavee"
                className="contact-link"
              >
                {email}
              </a>
            </p>
          </div>

          {/* Quick Links */}
          <div className="col-md-3">
            <h6 className="section-title">Quick Links</h6>
            <ul className="list-unstyled quick-links">
              <li>
                <a href="/" aria-label="Home">
                  Home
                </a>
              </li>
              <li>
                <a href="/aboutUs" aria-label="About Us">
                  About Us
                </a>
              </li>
            </ul>
          </div>

          {/* Socials */}
          <div className="col-md-4">
            <h6 className="section-title">Follow Us</h6>
            <p className="small mb-2">
              Ikuti Dsavee untuk update, promo, dan konten terbaru.
            </p>

            <div className="d-flex align-items-center gap-3 socials">
              <a
                href={buildInstagramUrl(contact.instagram)}
                className="social-icon"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Instagram ${contact.instagram}`}
              >
                {/* Instagram SVG */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M17.5 6.5h.01"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>

              <a
                href={buildTiktokUrl(contact.tiktok)}
                className="social-icon"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`TikTok ${contact.tiktok}`}
              >
                {/* TikTok SVG */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M9 8v7.5A4.5 4.5 0 1 0 13.5 20V9h3.5A4 4 0 0 1 20 13.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <hr className="footer-sep" />

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center pt-3">
          <div className="small copyright-text">
            © 2025 Dsavee. All rights reserved.
          </div>
          <div className="mt-2 mt-md-0">
            <a href="#top" className="back-to-top" aria-label="Back to top">
              Back to top
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
