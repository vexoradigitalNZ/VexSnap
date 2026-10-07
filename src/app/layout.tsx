import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VexSnap — Compress photos. Create PDFs.",
  description: "Compress photos, download smaller JPEGs, or turn your photos into a PDF — directly in your browser.",
  applicationName: "VexSnap",
  appleWebApp: { capable: true, title: "VexSnap", statusBarStyle: "default" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
