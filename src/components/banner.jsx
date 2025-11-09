import React, { useEffect, useState, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { getDatabase, ref, onValue } from "firebase/database";

export default function Banner() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);
  const [isLarge, setIsLarge] = useState(false);
  const swiperRef = useRef(null);
  const hoverIntervalRef = useRef(null);

  useEffect(() => {
    function handleResize() {
      setIsLarge(
        typeof window !== "undefined" ? window.innerWidth >= 992 : false
      );
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const dbInstance = getDatabase();
    const bannersRef = ref(dbInstance, "banners");

    const unsubscribe = onValue(
      bannersRef,
      (snapshot) => {
        if (!mounted.current) return;
        try {
          if (snapshot.exists()) {
            const val = snapshot.val();
            const items = Object.keys(val || {}).map((k) => ({
              id: k,
              ...val[k],
            }));
            items.sort((a, b) => {
              const na = parseInt((a.id.match(/\d+/) || [0])[0], 10) || 0;
              const nb = parseInt((b.id.match(/\d+/) || [0])[0], 10) || 0;
              return na - nb;
            });
            setBanners(items);
          } else {
            setBanners([]);
          }
          setError(null);
        } catch (err) {
          console.error("Error parsing banners snapshot:", err);
          setError("Gagal memproses data banner");
          setBanners([]);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("Realtime DB onValue error:", err);
        if (mounted.current) {
          setError("Gagal memuat banner: " + (err?.message || err));
          setBanners([]);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted.current = false;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const slidesToRender = (banners && banners.length ? banners : []).slice(0, 3);
  const fallback = [];
  const block2Data =
    (banners &&
      banners.find((b) => String(b.id).toLowerCase() === "banner-4")) ||
    fallback[1];
  const block3Data =
    (banners &&
      banners.find((b) => String(b.id).toLowerCase() === "banner-5")) ||
    fallback[2];

  const bannerBlocksStyle = isLarge
    ? {
        display: "grid",
        gridTemplateColumns: "1.7fr 1fr",
        gridTemplateRows: "repeat(2, 1fr)",
        gap: "1.5rem",
        alignItems: "stretch",
      }
    : {
        display: "grid",
        gridTemplateColumns: "1fr",
        gridTemplateRows: "auto",
        gap: "1rem",
      };

  const block1Style = isLarge ? { gridColumn: "1 / 2", gridRow: "1 / 3" } : {};
  const block2Style = isLarge ? { gridColumn: "2 / 3", gridRow: "1 / 2" } : {};
  const block3Style = isLarge ? { gridColumn: "2 / 3", gridRow: "2 / 3" } : {};
  const sideImageSize = isLarge ? "40% auto" : "cover";
  const sideImagePosition = isLarge ? "right center" : "center";

  // === Hover Control ===
  const startHoverLoop = () => {
    if (hoverIntervalRef.current) return;
    hoverIntervalRef.current = setInterval(() => {
      if (swiperRef.current && swiperRef.current.slideNext) {
        swiperRef.current.slideNext();
      }
    }, 2000); // setiap 2 detik geser
  };

  const stopHoverLoop = () => {
    if (hoverIntervalRef.current) {
      clearInterval(hoverIntervalRef.current);
      hoverIntervalRef.current = null;
    }
  };

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
            <div className="banner-blocks" style={bannerBlocksStyle}>
              {/* === Banner Utama === */}
              <div
                className="banner-ad large bg-info block-1"
                style={{ ...block1Style, cursor: "pointer" }}
                onMouseEnter={startHoverLoop}
                onMouseLeave={stopHoverLoop}
              >
                {loading ? (
                  <div className="p-5 text-center">Loading banners...</div>
                ) : (
                  <>
                    {error && (
                      <div
                        className="p-2 text-center text-danger"
                        style={{ fontSize: 12 }}
                      >
                        {error}
                      </div>
                    )}

                    <Swiper
                      modules={[Pagination]}
                      pagination={{ clickable: true }}
                      className="main-swiper"
                      loop={true}
                      speed={600}
                      onSwiper={(s) => (swiperRef.current = s)}
                    >
                      {slidesToRender.map((b) => (
                        <SwiperSlide key={b.id}>
                          <div className="row banner-content p-5">
                            <div className="content-wrapper col-md-7">
                              {b.tagline && (
                                <div className="categories my-3">
                                  {b.tagline}
                                </div>
                              )}
                              <h3 className="display-4">{b.title}</h3>
                              {b.description && <p>{b.description}</p>}
                            </div>
                            <div className="img-wrapper col-md-5 text-center">
                              <img
                                src={b.image || "/images/placeholder.png"}
                                className="img-fluid"
                                alt={b.title || "banner image"}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src =
                                    "/images/placeholder.png";
                                }}
                              />
                            </div>
                          </div>
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  </>
                )}
                <div className="swiper-pagination" />
              </div>

              {/* === Banner 2 === */}
              <div
                className="banner-ad bg-success-subtle block-2"
                style={{
                  ...block2Style,
                  backgroundImage: block2Data?.image
                    ? `url('${block2Data.image}')`
                    : "none",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: sideImagePosition,
                  backgroundSize: sideImageSize,
                }}
              >
                {loading ? (
                  <div className="p-5 text-center">Loading banners...</div>
                ) : (
                  <div className="row banner-content p-5">
                    <div className="content-wrapper col-md-7">
                      <div className="categories sale mb-3 pb-3">
                        {block2Data?.tagline}
                      </div>
                      <h3 className="banner-title">{block2Data?.title}</h3>
                    </div>
                  </div>
                )}
              </div>

              {/* === Banner 3 === */}
              <div
                className="banner-ad bg-danger block-3"
                style={{
                  ...block3Style,
                  backgroundImage: block3Data?.image
                    ? `url('${block3Data.image}')`
                    : "none",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: sideImagePosition,
                  backgroundSize: sideImageSize,
                }}
              >
                {loading ? (
                  <div className="p-5 text-center">Loading banners...</div>
                ) : (
                  <div className="row banner-content p-5">
                    <div className="content-wrapper col-md-7">
                      <div className="categories sale mb-3 pb-3">
                        {block3Data?.tagline}
                      </div>
                      <h3 className="item-title">{block3Data?.title}</h3>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* / Banner Blocks */}
          </div>
        </div>
      </div>
    </section>
  );
}
