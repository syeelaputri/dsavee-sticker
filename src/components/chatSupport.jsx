// src/components/ChatSupport.jsx
import React, { useEffect } from "react";

export default function ChatSupport() {
  useEffect(() => {
    const tawkSrc = process.env.REACT_APP_TAWK_SRC;
    console.log("[ChatSupport] REACT_APP_TAWK_SRC ->", tawkSrc);

    if (!tawkSrc) {
      console.warn(
        "[ChatSupport] Tawk src tidak ditemukan. Cek .env dan restart dev server."
      );
      return;
    }

    // hindari inject dua kali
    if (document.getElementById("tawk-script")) {
      console.log("[ChatSupport] tawk-script sudah ada, skip inject.");
      return;
    }

    // buat elemen script
    const s = document.createElement("script");
    s.id = "tawk-script";
    s.src = tawkSrc;
    s.async = true;
    s.charset = "UTF-8";
    s.setAttribute("crossorigin", "*");

    // event handlers untuk debugging
    s.onload = () => {
      console.log("[ChatSupport] tawk script loaded.");
      // jika Tawk API ada, pasang onLoad handler
      if (window.Tawk_API) {
        try {
          window.Tawk_API.onLoad = function () {
            console.log("[ChatSupport] window.Tawk_API.onLoad fired.");
          };
        } catch (e) {
          console.warn("[ChatSupport] gagal set onLoad:", e);
        }
      } else {
        console.warn(
          "[ChatSupport] window.Tawk_API masih undefined setelah load."
        );
      }
    };

    s.onerror = (e) => {
      console.error("[ChatSupport] gagal load tawk script:", e);
    };

    document.head.appendChild(s);

    // deteksi kemungkinan pemblokiran (adblock/CSP)
    const blockerCheck = setTimeout(() => {
      const el = document.getElementById("tawk-script");
      if (!el) {
        console.error(
          "[ChatSupport] elemen script tidak ada di DOM — kemungkinan diblokir oleh extension atau CSP."
        );
      } else if (!window.Tawk_API) {
        console.warn(
          "[ChatSupport] script ada tapi window.Tawk_API undefined — cek Network / console untuk error."
        );
      } else {
        console.log(
          "[ChatSupport] tampaknya OK: script ada & window.Tawk_API terdefinisi."
        );
      }
    }, 4000);

    return () => {
      clearTimeout(blockerCheck);
      const el = document.getElementById("tawk-script");
      if (el) el.remove();
    };
  }, []);

  return null;
}
