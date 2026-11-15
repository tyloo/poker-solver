import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Poker Solver",
    short_name: "Solver",
    description: "Preflop charts, equity, a postflop solver and quick advice for live 8-max tournaments.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1b1527",
    theme_color: "#1b1527",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
