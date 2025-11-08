import React, { useState } from "react";
import ProductGrid from "../components/productGrid";
import Features from "../components/features";
import Banner from "../components/banner";
import Navbar from "../components/navbar";

export default function Home() {
  // daftar keyword tetap sesuai permintaan
  const KEYWORDS = [
    "animal",
    "anime",
    "cute",
    "music",
    "quote",
    "brand",
    "halloween",
    "food",
  ];

  // selected keyword (string) atau null untuk no-filter
  const [filterKeyword, setFilterKeyword] = useState(null);

  const clearFilter = () => setFilterKeyword(null);

  return (
    <div>
      <Navbar />

      <main>
        {/* Banner Section */}
        <Banner />

        {/* Products Section */}
        <section className="py-5">
          <div className="container-fluid">
            <div className="row">
              <div className="col-md-12">
                <div className="bootstrap-tabs product-tabs">
                  {/* Header: title di kiri, filter di kanan */}
                  <div className="tabs-header d-flex justify-content-between align-items-center border-bottom my-5">
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <h3 style={{ margin: 0 }}>Products</h3>
                    </div>

                    {/* Controls di ujung kanan */}
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      {/* tampilkan badge keyword aktif */}
                      {filterKeyword && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span className="badge bg-primary text-white">
                            {filterKeyword}
                          </span>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={clearFilter}
                            aria-label="Clear filter"
                          >
                            Clear
                          </button>
                        </div>
                      )}

                      {/* Filter dropdown (di ujung kanan) */}
                      <div className="dropdown">
                        <button
                          className="btn btn-outline-secondary dropdown-toggle"
                          type="button"
                          id="productFilterDropdown"
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                        >
                          Filter
                        </button>
                        <ul
                          className="dropdown-menu dropdown-menu-end"
                          aria-labelledby="productFilterDropdown"
                        >
                          <li>
                            <button
                              className="dropdown-item"
                              type="button"
                              onClick={() => setFilterKeyword(null)}
                            >
                              Semua (Clear)
                            </button>
                          </li>
                          <li>
                            <hr className="dropdown-divider" />
                          </li>
                          {KEYWORDS.map((k) => (
                            <li key={k}>
                              <button
                                className={`dropdown-item ${
                                  filterKeyword === k ? "active" : ""
                                }`}
                                type="button"
                                onClick={() => setFilterKeyword(k)}
                              >
                                {k.charAt(0).toUpperCase() + k.slice(1)}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="tab-content" id="nav-tabContent">
                    <div
                      className="tab-pane fade show active"
                      id="nav-all"
                      role="tabpanel"
                      aria-labelledby="nav-all-tab"
                    >
                      {/* PASS filterKeyword ke ProductGrid */}
                      <ProductGrid filterKeyword={filterKeyword} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <Features />
      </main>
    </div>
  );
}
