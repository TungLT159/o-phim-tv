import React from "react";
import "./footer.scss";
import bg from "../../assets/footer-bg.jpg";
import logo from "../../assets/logo.png";
import { Link } from "react-router-dom";
import { movieType } from "../../api/tmdbApi";

const Footer = () => {
  return (
    <div className="footer" style={{ backgroundImage: `url(${bg})` }}>
      <div className="footer__content container">
        <div className="footer__top">
          <div className="footer__section footer__about">
            <div className="footer__logo">
              <img src={logo} alt="Ổ Phim Logo" />
              <Link to="/">Ổ Phim</Link>
            </div>
            <p className="footer__description">
              Khám phá thế giới điện ảnh với hàng ngàn bộ phim chất lượng cao.
              Trải nghiệm xem phim mượt mà, không quảng cáo với Ổ Phim.
            </p>
            <div className="footer__social">
              <button
                type="button"
                className="social-link facebook"
                aria-label="Facebook"
              >
                <i className="bx bxl-facebook"></i>
              </button>
              <button type="button" className="social-link twitter" aria-label="Twitter">
                <i className="bx bxl-twitter"></i>
              </button>
              <button
                type="button"
                className="social-link instagram"
                aria-label="Instagram"
              >
                <i className="bx bxl-instagram"></i>
              </button>
              <button type="button" className="social-link youtube" aria-label="YouTube">
                <i className="bx bxl-youtube"></i>
              </button>
            </div>
          </div>

          <div className="footer__section">
            <h3 className="footer__title">
              <i className="bx bx-movie-play"></i>
              Phim Lẻ
            </h3>
            <ul className="footer__links">
              <li>
                <Link to={`/danh-sach/${movieType.phimChieuRap}`}>
                  Phim Chiếu Rạp
                </Link>
              </li>
              <li>
                <Link to={`/danh-sach/${movieType.phimMoi}`}>Phim Mới</Link>
              </li>
              <li>
                <Link to={`/danh-sach/${movieType.phimLe}`}>Phim Lẻ</Link>
              </li>
            </ul>
          </div>

          <div className="footer__section">
            <h3 className="footer__title">
              <i className="bx bx-collection"></i>
              Phim Bộ
            </h3>
            <ul className="footer__links">
              <li>
                <Link to={`/danh-sach/${movieType.phimBo}`}>Phim Bộ</Link>
              </li>
              <li>
                <Link to={`/danh-sach/${movieType.phimHoatHinh}`}>
                  Phim Hoạt Hình
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer__divider"></div>

        <div className="footer__bottom">
          <div className="footer__copyright">
            <p>
              <i className="bx bx-copyright"></i>
              {new Date().getFullYear()} Ổ Phim. All rights reserved.
            </p>
            <p className="footer__tagline">
              Made with <i className="bx bxs-heart"></i> for movie lovers
            </p>
          </div>
          <div className="footer__stats">
            <div className="stat-item">
              <i className="bx bx-movie"></i>
              <div className="stat-info">
                <span className="stat-number">10,000+</span>
                <span className="stat-label">Phim</span>
              </div>
            </div>
            <div className="stat-item">
              <i className="bx bx-user"></i>
              <div className="stat-info">
                <span className="stat-number">100K+</span>
                <span className="stat-label">Người dùng</span>
              </div>
            </div>
            <div className="stat-item">
              <i className="bx bx-play-circle"></i>
              <div className="stat-info">
                <span className="stat-number">1M+</span>
                <span className="stat-label">Lượt xem</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
