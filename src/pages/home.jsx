import React from "react";
import ProductGrid from "../components/productGrid";

export default function Home() {
  return (
    <main>
      {/* Banner blocks (struktur dan kelas diambil dari index.html) */}
      <section
        className="py-3"
        style={{
          backgroundImage: "url('/images/background-pattern.jpg')",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      ></section>

      {/* Products */}
      <section className="py-5">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="bootstrap-tabs product-tabs">
                <div className="tabs-header d-flex justify-content-between border-bottom my-5">
                  <h3>Products</h3>
                </div>

                <div className="tab-content" id="nav-tabContent">
                  <div
                    className="tab-pane fade show active"
                    id="nav-all"
                    role="tabpanel"
                    aria-labelledby="nav-all-tab"
                  >
                    <ProductGrid />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
