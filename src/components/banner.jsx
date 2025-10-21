import React, { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

export default function Banner() {
  return (
    <section
      className="py-3 banner-section"
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
                <Swiper
                  modules={[Pagination]}
                  pagination={{ clickable: true }}
                  className="main-swiper"
                >
                  <SwiperSlide>
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
                          alt="product thumb"
                        />
                      </div>
                    </div>
                  </SwiperSlide>

                  <SwiperSlide>
                    <div className="row banner-content p-5">
                      <div className="content-wrapper col-md-7">
                        <div className="categories mb-3 pb-3">100% natural</div>
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
                          alt="product thumb"
                        />
                      </div>
                    </div>
                  </SwiperSlide>

                  <SwiperSlide>
                    <div className="row banner-content p-5">
                      <div className="content-wrapper col-md-7">
                        <div className="categories mb-3 pb-3">100% natural</div>
                        <h3 className="banner-title">Heinz Tomato Ketchup</h3>
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
                          src="/images/product-thumb-2.png"
                          className="img-fluid"
                          alt="product thumb"
                        />
                      </div>
                    </div>
                  </SwiperSlide>
                </Swiper>

                <div className="swiper-pagination" />
              </div>

              <div
                className="banner-ad bg-success-subtle block-2"
                style={{
                  background: "url('/images/ad-image-1.png') no-repeat",
                  backgroundPosition: "right bottom",
                }}
              >
                <div className="row banner-content p-5">
                  <div className="content-wrapper col-md-7">
                    <div className="categories sale mb-3 pb-3">20% off</div>
                    <h3 className="banner-title">Fruits & Vegetables</h3>
                    <a href="#" className="d-flex align-items-center nav-link">
                      Shop Collection
                      <svg width="24" height="24">
                        <use xlinkHref="#arrow-right" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              <div
                className="banner-ad bg-danger block-3"
                style={{
                  background: "url('/images/ad-image-2.png') no-repeat",
                  backgroundPosition: "right bottom",
                }}
              >
                <div className="row banner-content p-5">
                  <div className="content-wrapper col-md-7">
                    <div className="categories sale mb-3 pb-3">15% off</div>
                    <h3 className="item-title">Baked Products</h3>
                    <a href="#" className="d-flex align-items-center nav-link">
                      Shop Collection
                      <svg width="24" height="24">
                        <use xlinkHref="#arrow-right" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
            {/* / Banner Blocks */}
          </div>
        </div>
      </div>
    </section>
  );
}
