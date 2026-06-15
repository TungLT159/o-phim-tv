import { useState, useCallback, useRef } from "react";
import "./download-button.scss";

const QUALITIES = ["1080p", "720p", "480p", "360p"];

const DownloadButton = ({ item, currentEpisode }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState("720p");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadMessage, setDownloadMessage] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const pollTimerRef = useRef(null);
  const jobIdRef = useRef(null);

  const hasEpisode = Boolean(currentEpisode?.slug);

  const handleClose = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (jobIdRef.current) {
      const cancelUrl = new URL(
        `/api/download/cancel?id=${encodeURIComponent(jobIdRef.current)}`,
        window.location.origin,
      ).toString();
      fetch(cancelUrl).catch(() => {});
      jobIdRef.current = null;
    }

    setIsDownloading(false);
    setDownloadProgress(0);
    setDownloadMessage("");
    setDownloadError("");
    setShowModal(false);
  }, []);

  const triggerFileDownload = useCallback((jobId) => {
    const url = new URL(
      `/api/download/file?id=${encodeURIComponent(jobId)}`,
      window.location.origin,
    ).toString();
    const link = document.createElement("a");
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const pollDownloadStatus = useCallback(async (jobId) => {
    try {
      const statusUrl = new URL(
        `/api/download/status?id=${encodeURIComponent(jobId)}`,
        window.location.origin,
      ).toString();
      const response = await fetch(statusUrl);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Không lấy được tiến trình tải");
      }

      setDownloadProgress(data.progress || 0);
      setDownloadMessage(data.message || "Đang xử lý...");

      if (data.status === "ready") {
        setDownloadProgress(100);
        setDownloadMessage("File đã sẵn sàng, đang mở hộp thoại lưu...");
        triggerFileDownload(jobId);
        pollTimerRef.current = setTimeout(handleClose, 3000);
        return;
      }

      if (data.status === "error") {
        throw new Error(data.detail || data.message || "Không thể tạo file MP4");
      }

      pollTimerRef.current = setTimeout(() => pollDownloadStatus(jobId), 1500);
    } catch (error) {
      setIsDownloading(false);
      setDownloadError(error.message || "Không thể tạo file MP4");
    }
  }, [handleClose, triggerFileDownload]);

  const handleDownload = useCallback(async () => {
    if (!item?.slug || !currentEpisode?.slug) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadMessage("Đang gửi yêu cầu tải...");
    setDownloadError("");

    const params = new URLSearchParams({
      slug: item.slug,
      ep: currentEpisode.slug,
      quality: selectedQuality,
    });

    try {
      const startUrl = new URL(
        `/api/download/start?${params.toString()}`,
        window.location.origin,
      ).toString();
      const response = await fetch(startUrl);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Không thể bắt đầu tải");
      }

      setDownloadProgress(data.progress || 0);
      setDownloadMessage(data.message || "Đang xử lý...");
      jobIdRef.current = data.jobId;
      pollDownloadStatus(data.jobId);
    } catch (error) {
      setIsDownloading(false);
      setDownloadError(error.message || "Không thể bắt đầu tải");
    }
  }, [item?.slug, currentEpisode?.slug, selectedQuality, pollDownloadStatus]);

  const handleClick = useCallback(() => {
    if (!hasEpisode) return;
    setSelectedQuality("720p");
    setDownloadProgress(0);
    setDownloadMessage("");
    setDownloadError("");
    setShowModal(true);
  }, [hasEpisode]);

  return (
    <>
      <button
        className={`download-btn${!hasEpisode ? " download-btn--disabled" : ""}`}
        onClick={handleClick}
        title={!hasEpisode ? "Không có tập để tải" : "Tải về"}
        disabled={!hasEpisode}
      >
        <i className="bx bxs-download"></i>
        <span>Tải về</span>
      </button>

      {showModal && (
        <div className="download-modal-overlay" onClick={handleClose}>
          <div className="download-modal" onClick={(e) => e.stopPropagation()}>
            <button className="download-modal__close" onClick={handleClose}>
              <i className="bx bx-x"></i>
            </button>

            <h3 className="download-modal__title">Tải phim</h3>

            <div className="download-modal__info">
              <strong>{item?.title || item?.name}</strong>
              {currentEpisode && (
                <span className="download-modal__episode">
                  {currentEpisode.name}
                </span>
              )}
            </div>

            <div className="download-modal__qualities">
              <label className="download-modal__label">Chọn chất lượng:</label>
              <div className="download-modal__options">
                {QUALITIES.map((q) => (
                  <button
                    key={q}
                    className={`quality-option${selectedQuality === q ? " quality-option--active" : ""}`}
                    onClick={() => setSelectedQuality(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="download-modal__action"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <i className="bx bx-loader-alt bx-spin"></i>
                  Đang chuẩn bị...
                </>
              ) : (
                <>
                  <i className="bx bxs-download"></i>
                  Tải xuống
                </>
              )}
            </button>
            {isDownloading && (
              <div className="download-modal__progress">
                <div className="download-modal__progress-info">
                  <span>{downloadMessage || "Đang xử lý..."}</span>
                  <strong>{downloadProgress}%</strong>
                </div>
                <div className="download-modal__progress-track">
                  <div
                    className="download-modal__progress-bar"
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
                <p className="download-modal__hint">
                  Server đang tạo file MP4 tương thích rộng. Hộp thoại lưu file
                  sẽ xuất hiện sau khi xử lý xong.
                </p>
              </div>
            )}
            {downloadError && (
              <p className="download-modal__error" role="alert">
                {downloadError}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DownloadButton;
