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
      >
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="banner-blocks">
                <div className="banner-ad large bg-info block-1">
                  <div className="swiper main-swiper">
                    <div className="swiper-wrapper">
                      {/* slide 1 */}
                      <div className="swiper-slide">
                        <div className="row banner-content p-5">
                          <div className="content-wrapper col-md-7">
                            <div className="categories my-3">100% natural</div>
                            <h3 className="display-4">
                              Fresh Smoothie & Summer Juice
                            </h3>
                            <p>
                              Lorem ipsum dolor sit amet, consectetur adipiscing
                              elit. Dignissim massa diam elementum.
                            </p>
                            <a
                              href="#"
                              className="btn btn-outline-dark btn-lg text-uppercase fs-6 rounded-1 px-4 py-3 mt-3"
                            >
                              Shop Now
                            </a>
                          </div>
                          <div className="img-wrapper col-md-5">
                            <img
                              src="/images/product-thumb-1.png"
                              className="img-fluid"
                              alt="thumb"
                            />
                          </div>
                        </div>
                      </div>
                      {/* slide 2 */}
                      <div className="swiper-slide">
                        <div className="row banner-content p-5">
                          <div className="content-wrapper col-md-7">
                            <div className="categories mb-3 pb-3">
                              100% natural
                            </div>
                            <h3 className="banner-title">
                              Fresh Smoothie & Summer Juice
                            </h3>
                            <p>
                              Lorem ipsum dolor sit amet, consectetur adipiscing
                              elit. Dignissim massa diam elementum.
                            </p>
                            <a
                              href="#"
                              className="btn btn-outline-dark btn-lg text-uppercase fs-6 rounded-1"
                            >
                              Shop Collection
                            </a>
                          </div>
                          <div className="img-wrapper col-md-5">
                            <img
                              src="/images/product-thumb-1.png"
                              className="img-fluid"
                              alt="thumb2"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="swiper-pagination"></div>
                  </div>
                </div>
                {/* other banner items... (kept minimal) */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-5">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="bootstrap-tabs product-tabs">
                <div className="tabs-header d-flex justify-content-between border-bottom my-5">
                  <h3>Trending Products</h3>
                  <nav>
                    <div className="nav nav-tabs" id="nav-tab" role="tablist">
                      <a
                        href="#"
                        className="nav-link text-uppercase fs-6 active"
                        id="nav-all-tab"
                      >
                        All
                      </a>
                      <a
                        href="#"
                        className="nav-link text-uppercase fs-6"
                        id="nav-fruits-tab"
                      >
                        Fruits & Veges
                      </a>
                      <a
                        href="#"
                        className="nav-link text-uppercase fs-6"
                        id="nav-juices-tab"
                      >
                        Juices
                      </a>
                    </div>
                  </nav>
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
