import React, { useEffect, useState } from "react";
import { updatesBridge, isTauri } from "../../tauri-bridge";
import "./update-notification.scss";

const getInitialState = () => ({ status: "idle" });

const UpdateNotification = () => {
  const [updateState, setUpdateState] = useState(getInitialState);
  const [isDismissed, setIsDismissed] = useState(false);

  const updates = isTauri() ? updatesBridge : window.ophimUpdates;

  useEffect(() => {
    if (!updates) return undefined;

    let isMounted = true;
    let receivedUpdateEvent = false;
    const applyState = (state = getInitialState()) => {
      if (!isMounted) return;
      setUpdateState(state);
      if (["available", "downloaded", "error"].includes(state.status)) {
        setIsDismissed(false);
      }
    };
    const applyUpdateEvent = (state) => {
      receivedUpdateEvent = true;
      applyState(state);
    };

    const unsubscribe = updates.onStateChange?.(applyUpdateEvent);
    updates
      .getState()
      .then((state) => {
        if (!receivedUpdateEvent) applyState(state);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [updates]);

  if (!updates || isDismissed) return null;

  const { status, version, percent, message } = updateState;
  if (!["available", "download-progress", "downloaded", "error"].includes(status)) {
    return null;
  }

  const isAvailable = status === "available";
  const isDownloaded = status === "downloaded";
  const isDownloading = status === "download-progress";
  const isError = status === "error";

  return (
    <div className="update-notification" role="status" aria-live="polite">
      <div className="update-notification__content">
        <strong>
          {isAvailable && "Có bản cập nhật mới"}
          {isDownloading && "Đang tải cập nhật"}
          {isDownloaded && "Bản cập nhật đã sẵn sàng cài đặt"}
          {isError && "Không thể kiểm tra cập nhật"}
        </strong>
        <span>
          {version ? `Phiên bản ${version}` : null}
          {isDownloading ? ` ${percent || 0}%` : null}
          {isError ? message : null}
        </span>
      </div>
      <div className="update-notification__actions">
        {isAvailable && (
          <button type="button" onClick={() => updates.download()}>
            Tải cập nhật
          </button>
        )}
        {isDownloaded && (
          <button type="button" onClick={() => updates.install()}>
            Khởi động lại để cập nhật
          </button>
        )}
        <button type="button" className="update-notification__dismiss" onClick={() => setIsDismissed(true)}>
          Để sau
        </button>
      </div>
    </div>
  );
};

export default UpdateNotification;
