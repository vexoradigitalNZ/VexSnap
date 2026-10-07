import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VexSnap",
    short_name: "VexSnap",
    description: "Compress photos, download smaller JPEGs, or turn your photos into a PDF — directly in your browser.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8faf6",
    theme_color: "#376a55",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
