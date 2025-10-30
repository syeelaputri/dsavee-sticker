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
            Dsavee adalah platform retail stiker yang berfokus untuk menyediakan
            produk kreatif dan fungsional bagi mahasiswa serta masyarakat di
            sekitar kawasan kampus. Kami menghadirkan beragam stiker berkualitas
            — mulai dari desain populer hingga ilustrasi estetik.
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
            Dsavee Sticker menyediakan berbagai jenis stiker: Stiker karakter
            populer (anime, k-pop, dll). Stiker lucu & estetik untuk hias
            laptop, HP, motor, journaling.
          </p>

          <h3 className="mt-4">Latar belakang</h3>
          <p className="text-muted">
            Dsavee didirikan pada tahun 2025 oleh sekumpulan mahasiswa yang
            melihat tingginya kebutuhan akan stiker unik dan terjangkau di
            lingkungan kampus. Pembelian dari toko online luar daerah sering
            kali membutuhkan waktu lama dan tidak sesuai dengan preferensi
            desain lokal.
            <p className="text-muted">
              Melihat peluang tersebut, Dsavee hadir sebagai solusi yang:
            </p>
            <li>Lebih dekat dengan kebutuhan mahasiswa.</li>
            <li>Lebih cepat dalam proses pemenuhan pesanan.</li>
            <li>
              Dan lebih adaptif terhadap tren yang berkembang di lingkungan
              kampus.
            </li>
          </p>
          <p className="text-muted">
            Berawal dari pemesanan berbasismedia sosial, kini Dsavee berkembang
            menjadi platform e-commerce dengan sistem pemesanan yang lebih
            profesional dan terstruktur.
          </p>
        </div>

        <div className="col-md-5">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">Fakta Singkat</h5>
              <ul className="list-unstyled mb-0">
                <li>
                  <strong>Didirikan:</strong> 2025
                </li>
                <li>
                  <strong>Bahan utama:</strong> Vinyl waterproof
                </li>
                <li>
                  <strong>Waktu produksi:</strong> 1–3 hari kerja
                </li>
                <li>
                  <strong>Pengiriman:</strong> Airmadidi
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
                Menjadi platform stiker terpercaya bagi mahasiswa dan pelanggan
                di sekitar wilayah kami dengan menyediakan produk kreatif
                berkualitas, proses belanja yang praktis, serta pertumbuhan
                layanan yang berkelanjutan untuk menjangkau lebih banyak
                pengguna ke depannya.
              </p>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card h-100 border-0 shadow-sm p-3">
              <h5>Misi</h5>
              <ul className="text-muted mb-0">
                <li>
                  Membuat semua orang bisa mengekspresikan diri dengan cara yang
                  mudah dan menyenangkan — melalui stiker!
                </li>
                <li>
                  Menyediakan beragam pilihan stiker yang relevan dengan tren
                  dan kebutuhan mahasiswa.
                </li>
                <li>
                  Menghadirkan pengalaman belanja yang efisien dan nyaman bagi
                  pelanggan.
                </li>
                <li>
                  Berkembang secara berkelanjutan untuk memperluas jangkauan
                  layanan ke area yang lebih luas.
                </li>
                <li>
                  Mengutamakan kualitas material dan ketepatan proses produksi.
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
          Kantor pusat kami berada di: <strong>Manado, Indonesia</strong>. Saat
          ini kami melayani pengiriman di wilayah airmadidi saja.
        </p>

        <div className="row mt-3">
          <div className="col-md-6">
            {/* Google Maps iframe (ganti src sesuai lokasi nyata) */}
            <div className="ratio ratio-16x9 rounded overflow-hidden shadow-sm">
              <iframe
                title="Dsavee Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3989.626407715429!2d124.9857459!3d1.4166892!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x32870f418c43ad25%3A0xd9302d8cf99e7e92!2sDsavee!5e0!3m2!1sid!2sid!4v1730277200000!5m2!1sid!2sid"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
              ></iframe>
            </div>
          </div>

          <div className="col-md-6 d-flex flex-column justify-content-center">
            <div className="mb-2">
              <strong>Area layanan</strong>
              <p className="text-muted mb-0">Wilayah Airmadidi.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Kontak */}
      <section id="kontak" className="mb-5">
        <h3>Kontak</h3>
        <p className="text-muted">
          Hubungi tim kami untuk pertanyaan dan kerjasama:
        </p>

        <div className="row g-3">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm p-3">
              <h6>Email</h6>
              <p className="mb-0">
                <a href="mailto:hello@dsavee.com">dsaveesticker@gmail.com</a>
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
              <h6>Media Sosial Instagram</h6>
              <p className="mb-0">
                <a
                  href="https://instagram.com/dsavee"
                  target="_blank"
                  rel="noreferrer"
                >
                  @dsaveesticker
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
