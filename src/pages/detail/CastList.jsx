import React, { useState, useEffect } from "react";

import axiosClient from "../../api/axiosClient";
import { getTMDBProfileImage } from "../../utils/tmdbImageFetcher";
import { SwiperSlide, Swiper } from "swiper/react";

const CastList = (props) => {
  const [casts, setCasts] = useState([]);

  useEffect(() => {
    const getCredits = async () => {
      const response = await axiosClient.get(
        `https://ophim1.com/v1/api/phim/${props.id}/peoples`
      );
      setCasts(response.data.peoples.slice(0, 8));
    };
    getCredits();
  }, [props.id]);
  return (
    <div className="casts">
      <Swiper
        grabCursor={true}
        spaceBetween={20}
        slidesPerView={6}
        navigation={{
          nextEl: ".casts-button-next",
          prevEl: ".casts-button-prev",
        }}
      >
        {casts.map((item) => (
          <SwiperSlide key={`${item.id ?? item.tmdb_id ?? item.name}-${item.profile_path ?? "no-profile"}`}>
            <div className="casts__item" style={{ textAlign: "center" }}>
              <div
                className="casts__item__img"
                style={{
                  width: "120px",
                  height: "120px",
                  margin: "0 auto 10px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  backgroundImage: `url(${getTMDBProfileImage(item.profile_path)})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              ></div>
              <p
                className="casts__item__name"
                style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#fff",
                  textAlign: "center",
                }}
              >
                {item.name}
              </p>
            </div>
          </SwiperSlide>
        ))}

        {/* Nút điều hướng */}
        <div
          className="casts-button-prev"
          style={{
            position: "absolute",
            top: "50%",
            left: "0",
            transform: "translateY(-50%)",
            zIndex: 10,
            cursor: "pointer",
            fontSize: "24px",
            color: "#fff",
            padding: "10px",
            background: "rgba(0,0,0,0.5)",
            borderRadius: "50%",
          }}
        >
          ‹
        </div>
        <div
          className="casts-button-next"
          style={{
            position: "absolute",
            top: "50%",
            right: "0",
            transform: "translateY(-50%)",
            zIndex: 10,
            cursor: "pointer",
            fontSize: "24px",
            color: "#fff",
            padding: "10px",
            background: "rgba(0,0,0,0.5)",
            borderRadius: "50%",
          }}
        >
          ›
        </div>
      </Swiper>
    </div>
  );
};

export default CastList;
