import React, { useState, useEffect, useRef } from "react";

import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import Button, { OutlineButton } from "../button/Button";
import Modal, { ModalContent } from "../modal/Modal";

import tmdbApi, { movieType } from "../../api/tmdbApi";
import axiosClient from "../../api/axiosClient";
import { fetchTMDBImages } from "../../utils/tmdbImageFetcher";
import "./hero-slide.scss";
import { useNavigate } from "react-router-dom";

const HeroSlide = () => {
  const [movieItems, setMovieItems] = useState([]);

  useEffect(() => {
    const getMovies = async () => {
      const params = { page: 1 };
      try {
        const response = await tmdbApi.getMoviesList(movieType.phimChieuRap, {
          params,
        });
        setMovieItems(response.data.items.slice(0, 10));
        // console.log(response);
      } catch {
        console.log("error");
      }
    };
    getMovies();
  }, []);

  return (
    <div className="hero-slide">
      <Swiper
        modules={[Autoplay]}
        grabCursor={true}
        spaceBetween={0}
        slidesPerView={1}
        autoplay={{ delay: 8000 }}
      >
        {movieItems.map((item) => (
          <SwiperSlide key={item._id ?? item.slug}>
            {({ isActive }) => (
              <HeroSlideItem
                item={item}
                className={`${isActive ? "active" : ""}`}
              />
            )}
          </SwiperSlide>
        ))}
      </Swiper>
      {movieItems.map((item) => (
        <TrailerModal key={item._id ?? item.slug} item={item} />
      ))}
    </div>
  );
};

const HeroSlideItem = (props) => {
  let navigate = useNavigate();
  const item = props.item;
  const [movie, setMovie] = useState(null);
  const [poster_url, setPosterUrl] = useState("/poster-mau.png");
  const [backdrop_url, setBackdropUrl] = useState("");
  const [overview, setOverview] = useState("");

  // Fetch movie detail từ Ophim API
  useEffect(() => {
    const fetchMovieDetail = async () => {
      if (!item.slug) return;
      try {
        const response = await axiosClient.get(
          `https://ophim1.com/v1/api/phim/${item.slug}`,
        );
        setMovie(response.data);
      } catch (error) {
        console.error("Lỗi khi load movie detail:", error);
      }
    };
    fetchMovieDetail();
  }, [item.slug]);

  // Fetch TMDB images
  useEffect(() => {
    const loadImages = async () => {
      if (!item?.tmdb) return;
      const {
        posterUrl,
        backdropUrl,
        overview: tmdbOverview,
      } = await fetchTMDBImages(item.tmdb);
      setPosterUrl(posterUrl);
      setBackdropUrl(backdropUrl);
      setOverview(tmdbOverview);
    };
    loadImages();
  }, [item]);

  // Hàm lấy trailer từ TMDB
  const fetchTMDBTrailer = async () => {
    if (!item?.tmdb?.id) return null;

    try {
      const type = item.tmdb.type || "movie";

      // Thử lấy trailer tiếng Việt trước
      let response = await axiosClient.get(
        `https://api.themoviedb.org/3/${type}/${item.tmdb.id}/videos?api_key=${process.env.REACT_APP_TMDB_API_KEY}&language=vi-VN`,
      );

      // Nếu không có trailer tiếng Việt, lấy tiếng Anh
      if (!response.results || response.results.length === 0) {
        response = await axiosClient.get(
          `https://api.themoviedb.org/3/${type}/${item.tmdb.id}/videos?api_key=${process.env.REACT_APP_TMDB_API_KEY}&language=en-US`,
        );
      }

      // Ưu tiên: Trailer chính thức > Teaser > Video đầu tiên
      const trailer =
        response.results?.find(
          (video) => video.type === "Trailer" && video.site === "YouTube",
        ) ||
        response.results?.find(
          (video) => video.type === "Teaser" && video.site === "YouTube",
        ) ||
        response.results?.find((video) => video.site === "YouTube");

      if (trailer) {
        return `https://www.youtube.com/embed/${trailer.key}?autoplay=1`;
      }
    } catch (error) {
      console.error("Lỗi khi lấy trailer từ TMDB:", error);
    }

    return null;
  };

  const setModalActive = async () => {
    const modal = document.querySelector(`#modal_${item._id ?? item.slug}`);
    const modalContent = modal.querySelector(".modal__content");

    // Hiển thị loading
    modalContent.innerHTML = `
      <div class="trailer-loading">
        <i class='bx bx-loader-alt bx-spin'></i>
        <p>Đang tải trailer...</p>
      </div>
      <div class="modal__content__close modal__content__close--floating" aria-label="Đóng modal" role="button" tabindex="0">
        <i class="bx bx-x"></i>
      </div>
    `;

    // Add close button event listener ngay
    const closeBtn = modalContent.querySelector(".modal__content__close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        modal.classList.remove("active");
        modalContent.innerHTML = "";
      });
    }

    modal.classList.add("active");

    try {
      // Lấy trailer từ TMDB
      const trailerUrl = await fetchTMDBTrailer();

      if (trailerUrl) {
        modalContent.innerHTML = `
          <div class="trailer-header">
            <h3><i class='bx bx-play-circle'></i> ${movie?.item?.name || item.name}</h3>
          </div>
          <div class="trailer-container">
            <iframe src="${trailerUrl}" title="trailer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
          <div class="modal__content__close modal__content__close--floating" aria-label="Đóng modal" role="button" tabindex="0">
            <i class="bx bx-x"></i>
          </div>
        `;
      } else {
        modalContent.innerHTML = `
          <div class="no-trailer">
            <i class='bx bx-video-off'></i>
            <p>Không tìm thấy trailer cho phim này.</p>
          </div>
          <div class="modal__content__close modal__content__close--floating" aria-label="Đóng modal" role="button" tabindex="0">
            <i class="bx bx-x"></i>
          </div>
        `;
      }

      // Re-add close button event listener
      const closeBtnFinal = modalContent.querySelector(
        ".modal__content__close",
      );
      if (closeBtnFinal) {
        closeBtnFinal.addEventListener("click", () => {
          modal.classList.remove("active");
          modalContent.innerHTML = "";
        });
      }
    } catch (err) {
      console.error("Lỗi khi tải trailer:", err);
      modalContent.innerHTML = `
        <div class="error-message">
          <i class='bx bx-error-circle'></i>
          <p>Lỗi khi tải trailer. Vui lòng thử lại sau.</p>
        </div>
        <div class="modal__content__close modal__content__close--floating" aria-label="Đóng modal" role="button" tabindex="0">
          <i class="bx bx-x"></i>
        </div>
      `;

      // Add close button event listener for error state
      const closeBtnError = modalContent.querySelector(
        ".modal__content__close",
      );
      if (closeBtnError) {
        closeBtnError.addEventListener("click", () => {
          modal.classList.remove("active");
          modalContent.innerHTML = "";
        });
      }
    }
  };

  return (
    <div
      className={`hero-slide__item ${props.className}`}
      style={{ backgroundImage: `url(${backdrop_url})` }}
    >
      <div className="hero-slide__item__content container">
        <div className="hero-slide__item__content__info">
          <h2 className="title">{movie?.item.name || item.name}</h2>
          <div className="overview">
            {(overview
              ? overview
              : movie?.seoOnPage.descriptionHead.replace(/<[^>]+>/g, "")) ||
              "Đang tải..."}
          </div>
          <div className="btns">
            <Button onClick={() => navigate("/movie/" + item.slug)}>
              Xem ngay
            </Button>
            <OutlineButton onClick={setModalActive}>Xem trailer</OutlineButton>
          </div>
        </div>
        <div className="hero-slide__item__content__poster">
          <img src={poster_url} alt="" />
        </div>
      </div>
    </div>
  );
};

const TrailerModal = (props) => {
  const item = props.item;

  const iframeRef = useRef(null);

  const onClose = () => iframeRef.current.setAttribute("src", "");

  return (
    <Modal active={false} id={`modal_${item._id ?? item.slug}`}>
      <ModalContent
        onClose={onClose}
        closeButtonClassName="modal__content__close--floating"
      >
        <iframe
          ref={iframeRef}
          width="100%"
          height="500px"
          title="trailer"
        ></iframe>
      </ModalContent>
    </Modal>
  );
};

export default HeroSlide;
