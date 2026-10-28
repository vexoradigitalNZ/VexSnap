"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function GuideVideo() {
  const pathname = usePathname();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const stop = () => {
      video.pause();
      video.currentTime = 0;
    };
    const stopWhenHidden = () => {
      if (document.visibilityState === "hidden") stop();
    };
    const stopOnNavigation = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (link) stop();
    };
    document.addEventListener("click", stopOnNavigation, true);
    window.addEventListener("popstate", stop);
    document.addEventListener("visibilitychange", stopWhenHidden);
    window.addEventListener("pagehide", stop);
    return () => {
      stop();
      document.removeEventListener("click", stopOnNavigation, true);
      window.removeEventListener("popstate", stop);
      document.removeEventListener("visibilitychange", stopWhenHidden);
      window.removeEventListener("pagehide", stop);
    };
  }, [pathname]);

  function stop() {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }

  return (
    <>
      <div className="guide-player">
        <video ref={videoRef} controls playsInline preload="metadata" disablePictureInPicture
          onPlay={() => { if (document.visibilityState === "hidden") stop(); }}
          poster="/videos/vexsnap-guide-poster.jpg" width={1920} height={1080}
          aria-label="How to use VexSnap video guide" aria-describedby="guide-player-help">
          <source src="/videos/vexsnap-guide.mp4" type="video/mp4" />
          Your browser does not support embedded video. <a href="/videos/vexsnap-guide.mp4">Open the video guide</a>.
        </video>
      </div>
      <div className="guide-playback-actions">
        <button type="button" className="button guide-stop" onClick={stop}>
          <span aria-hidden="true">■</span> Stop video
        </button>
        <p id="guide-player-help" className="guide-player-help">Use the player controls to pause or go fullscreen. Stop resets the video. Leaving this page or switching tabs also stops playback.</p>
      </div>
    </>
  );
}
