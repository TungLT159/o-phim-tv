import React, { useEffect, useState } from "react";
import "./intro-splash.scss";

const IntroSplash = ({ children, duration = 1800, fadeDuration = 250 }) => {
  const [phase, setPhase] = useState("visible");

  useEffect(() => {
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
    return children;
  }

  return (
    <div
      className={`intro-splash${phase === "leaving" ? " intro-splash--leaving" : ""}`}
      data-testid="intro-splash"
      aria-label="O Phim intro"
    >
      <div className="intro-splash__glow" aria-hidden="true" />
      <img className="intro-splash__logo" src="/logo512.png" alt="O Phim" />
      <div className="intro-splash__title">Ổ Phim</div>
    </div>
  );
};

export default IntroSplash;
