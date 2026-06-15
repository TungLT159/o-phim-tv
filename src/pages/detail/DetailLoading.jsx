const DetailLoading = () => (
  <div className="detail-loading" role="status" aria-label="Đang tải phim">
    <div className="banner detail-loading__banner"></div>

    <div className="mb-3 movie-content container detail-loading__content">
      <div className="movie-content__poster">
        <div className="movie-content__poster__img detail-loading__poster"></div>
      </div>
      <div className="movie-content__info detail-loading__info">
        <div className="detail-loading__line detail-loading__title"></div>
        <div className="detail-loading__chips">
          <span className="detail-loading__chip"></span>
          <span className="detail-loading__chip"></span>
          <span className="detail-loading__chip"></span>
        </div>
        <div className="detail-loading__tags">
          <span className="detail-loading__tag"></span>
          <span className="detail-loading__tag"></span>
          <span className="detail-loading__tag"></span>
        </div>
        <div className="detail-loading__line"></div>
        <div className="detail-loading__line detail-loading__line--wide"></div>
        <div className="detail-loading__line detail-loading__line--short"></div>
      </div>
    </div>

    <div className="container">
      <div className="section mb-3">
        <div className="watch-section detail-loading__watch">
          <div className="video-player">
            <div className="video-wrapper detail-loading__video"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default DetailLoading;
