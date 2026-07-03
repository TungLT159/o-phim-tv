import React, { useEffect, useState } from "react";
import "./intro-splash.scss";

const IntroSplash = ({ children, duration = 1800, fadeDuration = 250 }) => {
  const [phase, setPhase] = useState("entering");

  useEffect(() => {
    // Đảm bảo animation chạy sau khi component mount
    requestAnimationFrame(() => {
      setPhase("visible");
    });

    const leavingTimer = setTimeout(() => {
      setPhase("leaving");
    }, duration);
    const doneTimer = setTimeout(() => {
      setPhase("done");
    }, duration + fadeDuration);

    return () => {
      clearTimeout(leavingTimer);
      clearTimeout(doneTimer);
    };
  }, [duration, fadeDuration]);

  if (phase === "done") {
    return <div className="intro-splash__children">{children}</div>;
  }

  return (
    <div
      className={`intro-splash intro-splash--${phase}`}
      data-testid="intro-splash"
      aria-label="O Phim intro"
      style={{
        // Inline style để ngăn white flash trước khi CSS load
        backgroundColor: "#050608",
      }}
    >
      <div className="intro-splash__glow" aria-hidden="true" />
      <img className="intro-splash__logo" src="/logo512.png" alt="O Phim" />
      <div className="intro-splash__title">Ổ Phim</div>
    </div>
  );
};

export default IntroSplash;
