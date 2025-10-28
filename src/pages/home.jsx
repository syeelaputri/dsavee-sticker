import React from "react";
import ProductGrid from "../components/productGrid";
import Features from "../components/features";
import Banner from "../components/banner";
import Navbar from "../components/navbar";

export default function Home() {
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

        {/* Features Section */}
        <Features />
      </main>
    </div>
  );
}
