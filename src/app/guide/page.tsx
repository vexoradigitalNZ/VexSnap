import type { Metadata } from "next";
import Link from "next/link";
import { GuideVideo } from "@/components/GuideVideo";
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
        <GuideVideo />
        <div className="guide-ready">
          <p>Ready to give it a go?</p>
          <Link className="button primary" href="/">Start using VexSnap <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </main>
  );
}
