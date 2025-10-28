// src/pages/aboutUs.jsx
import React, { useEffect } from "react";

export default function AboutUs() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "About Us — Dsavee";
  }, []);

  return (
    <main className="container my-5">
      {/* Hero */}
      <section className="row align-items-center mb-5">
        <div className="col-lg-6">
          <h1 className="display-5 fw-bold">Tentang Dsavee</h1>
          <p className="lead text-muted">
            Dsavee adalah platform e-commerce spesialis stiker berkualitas —
            dari stiker dekoratif, vinyl, hingga stiker edisi terbatas. Kami
            membantu kreator & bisnis kecil menjual desain stiker unik dengan
            mudah.
          </p>

          <div className="mt-4 d-flex gap-2">
            <a href="#visi" className="btn btn-primary">
              Visi & Misi
            </a>
            <a href="#kontak" className="btn btn-outline-secondary">
              Kontak Kami
            </a>
          </div>
        </div>

        <div className="col-lg-6 text-center mt-4 mt-lg-0">
          <div style={{ maxWidth: 420, margin: "0 auto" }}>
            <img
              src="/images/about-hero.jpg"
              alt="Stickers by Dsavee"
              className="img-fluid rounded"
              style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
            />
          </div>
        </div>
      </section>

      {/* Deskripsi singkat & Latar belakang */}
      <section className="row mb-5">
        <div className="col-md-7">
          <h3>Apa yang kami jual</h3>
          <p className="text-muted">
            Kami menjual berbagai jenis stiker: dekoratif, waterproof vinyl,
            label produk, serta stiker custom untuk brand dan event. Fokus kami:
            kualitas bahan, finishing rapi, dan pengiriman cepat.
          </p>

          <h3 className="mt-4">Latar belakang</h3>
          <p className="text-muted">
            Dsavee didirikan pada 2022 oleh sekelompok mahasiswa/desainer yang
            ingin membantu kreator lokal menjangkau pembeli lebih luas. Dimulai
            sebagai toko kecil di media sosial, kini kami membangun platform
            untuk mempermudah penjualan dan manajemen pesanan.
          </p>
        </div>

        <div className="col-md-5">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Fakta Singkat</h5>
              <ul className="list-unstyled mb-0">
                <li>
                  <strong>Didirikan:</strong> 2022
                </li>
                <li>
                  <strong>Bahan utama:</strong> Vinyl waterproof, matte paper
                </li>
                <li>
                  <strong>Waktu produksi:</strong> 1–3 hari kerja
                </li>
                <li>
                  <strong>Pengiriman:</strong> Nasional (Indonesia)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Visi & Misi */}
      <section id="visi" className="mb-5">
        <h3>Visi & Misi</h3>

        <div className="row mt-3 g-3">
          <div className="col-md-6">
            <div className="card h-100 border-0 shadow-sm p-3">
              <h5>Visi</h5>
              <p className="text-muted mb-0">
                Menjadi marketplace stiker terdepan di Indonesia yang
                memberdayakan kreator lokal dan memberikan produk berkualitas
                dengan layanan terpercaya.
              </p>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card h-100 border-0 shadow-sm p-3">
              <h5>Misi</h5>
              <ul className="text-muted mb-0">
                <li>
                  Menyediakan platform mudah untuk kreator memajang & menjual
                  stiker.
                </li>
                <li>
                  Menjamin kualitas bahan dan cetak dengan kontrol produksi.
                </li>
                <li>
                  Mempermudah proses pembayaran (termasuk crypto) dan pelacakan
                  pesanan.
                </li>
                <li>
                  Membangun komunitas pembeli dan kreator yang saling mendukung.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Lokasi & Jangkauan Layanan */}
      <section className="mb-5">
        <h3>Lokasi & Jangkauan Layanan</h3>
        <p className="text-muted">
          Kantor pusat kami berada di (contoh):{" "}
          <strong>Jakarta, Indonesia</strong>. Saat ini kami melayani pengiriman
          ke seluruh provinsi di Indonesia. Untuk pengiriman internasional,
          hubungi tim kami untuk opsi khusus.
        </p>

        <div className="row mt-3">
          <div className="col-md-6">
            {/* Google Maps iframe (ganti src sesuai lokasi nyata) */}
            <div className="ratio ratio-16x9 rounded overflow-hidden shadow-sm">
              <iframe
                title="Dsavee Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d317714.2251234567!2d106.6894303!3d-6.2293862!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f2b...!2sJakarta!5e0!3m2!1sen!2sid!4v1610000000000!5m2!1sen!2sid"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
              ></iframe>
            </div>
          </div>

          <div className="col-md-6 d-flex flex-column justify-content-center">
            <div className="mb-2">
              <strong>Area layanan</strong>
              <p className="text-muted mb-0">
                Seluruh Indonesia (Jawa, Sumatra, Kalimantan, Sulawesi, Bali &
                Nusa Tenggara).
              </p>
            </div>

            <div className="mt-3">
              <strong>Tersedia untuk kerjasama B2B</strong>
              <p className="text-muted mb-0">
                Bulk order, label produk, dan custom corporate sticker.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Kontak */}
      <section id="kontak" className="mb-5">
        <h3>Kontak</h3>
        <p className="text-muted">
          Hubungi tim kami untuk pertanyaan, kerjasama, atau pemesanan custom:
        </p>

        <div className="row g-3">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm p-3">
              <h6>Email</h6>
              <p className="mb-0">
                <a href="mailto:hello@dsavee.com">hello@dsavee.com</a>
              </p>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card border-0 shadow-sm p-3">
              <h6>Telepon / WA</h6>
              <p className="mb-0">
                <a href="tel:+6281234567890">+62 812-3456-7890</a>
              </p>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card border-0 shadow-sm p-3">
              <h6>Media Sosial</h6>
              <p className="mb-0">
                <a
                  href="https://instagram.com/dsavee"
                  target="_blank"
                  rel="noreferrer"
                >
                  @dsavee
                </a>{" "}
                •
                <a
                  href="https://twitter.com/dsavee"
                  target="_blank"
                  rel="noreferrer"
                >
                  {" "}
                  @dsavee
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-muted mb-2">
            Atau isi formulir singkat untuk permintaan khusus:
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert("Terima kasih! Kami akan menghubungi Anda."); // sementara, bisa ganti ke API
              e.target.reset();
            }}
            className="row g-2"
          >
            <div className="col-md-4">
              <input
                name="name"
                required
                className="form-control"
                placeholder="Nama"
              />
            </div>
            <div className="col-md-4">
              <input
                name="email"
                type="email"
                required
                className="form-control"
                placeholder="Email"
              />
            </div>
            <div className="col-md-4">
              <input
                name="phone"
                className="form-control"
                placeholder="Telepon (opsional)"
              />
            </div>
            <div className="col-12">
              <textarea
                name="message"
                required
                className="form-control"
                rows="4"
                placeholder="Pesan..."
              ></textarea>
            </div>
            <div className="col-12 text-end">
              <button type="submit" className="btn btn-primary">
                Kirim Pesan
              </button>
            </div>
          </form>
        </div>
      </section>

      <footer className="text-center py-4 text-muted">
        © {new Date().getFullYear()} Dsavee — All rights reserved.
      </footer>
    </main>
  );
}
