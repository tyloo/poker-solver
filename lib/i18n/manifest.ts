import type { MetadataRoute } from "next";
import type { Locale } from "./locale";
import { messages } from "./messages";

/**
 * The web app manifest of a language, served at `/manifest.webmanifest` and `/fr/manifest.webmanifest`.
 * Both start at `/`, so a launch from the home screen follows the phone's language.
 */
export function webManifest(locale: Locale): MetadataRoute.Manifest {
  const { meta } = messages(locale);
  return {
    background_color: "#1b1527",
    description: meta.description,
    display: "standalone",
    icons: [
      { sizes: "192x192", src: "/icon-192.png", type: "image/png" },
      { sizes: "512x512", src: "/icon-512.png", type: "image/png" },
      { purpose: "maskable", sizes: "512x512", src: "/icon-maskable-512.png", type: "image/png" },
    ],
    id: "/",
    lang: locale,
    name: meta.name,
    orientation: "portrait",
    short_name: meta.shortName,
    start_url: "/",
    theme_color: "#1b1527",
  };
}

export const manifestResponse = (locale: Locale) => Response.json(webManifest(locale), { headers: { "Content-Type": "application/manifest+json" } });
