import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export const metadata: Metadata = {
  title: "How to use VexSnap — Video guide",
  description: "Watch a quick guide to compressing photos and creating PDFs with VexSnap.",
};

export default function GuidePage() {
  return (
    <main className="shell guide-page">
      <header className="topbar">
        <Link className="brand-link" href="/" aria-label="VexSnap home">
          <span className="brand-mark"><BrandMark /></span>
          <span className="brand">Vex<span>Snap</span></span>
        </Link>
        <Link className="guide-back" href="/">← Back to app</Link>
      </header>
      <section className="guide-content" aria-labelledby="guide-title">
        <div className="hero-badge">THE VEXSNAP VIDEO GUIDE</div>
        <h1 id="guide-title">A little guidance.<br /><span>Then you’re ready.</span></h1>
        <p className="guide-intro">See how to add photos, make files smaller, and create a PDF ready to share.</p>
        <div className="guide-player">
          <video controls playsInline preload="metadata" poster="/videos/vexsnap-guide-poster.jpg" width={1920} height={1080} aria-label="How to use VexSnap video guide" aria-describedby="guide-player-help">
            <source src="/videos/vexsnap-guide.mp4" type="video/mp4" />
            Your browser does not support embedded video. <a href="/videos/vexsnap-guide.mp4">Open the video guide</a>.
          </video>
        </div>
        <p id="guide-player-help" className="guide-player-help">Press play to begin. Pause or replay any time, or use the fullscreen control for a closer look.</p>
        <div className="guide-ready">
          <p>Ready to give it a go?</p>
          <Link className="button primary" href="/">Start using VexSnap <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </main>
  );
}
