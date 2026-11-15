// Renders the PWA icons into public/. Run: node scripts/generate-icons.mjs
import { writeFile } from "node:fs/promises";
import { ImageResponse } from "next/dist/compiled/@vercel/og/index.node.js";
import { createElement as h } from "react";

const SPADE = "M12 2C9 6 4 9 4 13.5 4 16 6 18 8.5 18c1.3 0 2.4-.5 3-1.3-.3 2-1 3.6-2.5 5.3h6c-1.5-1.7-2.2-3.3-2.5-5.3.6.8 1.7 1.3 3 1.3 2.5 0 4.5-2 4.5-4.5C20 9 15 6 12 2z";

function icon(size, cardScale) {
  const w = size * cardScale;
  const u = w / 100;
  return h(
    "div",
    { style: { width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#1b1527" } },
    h(
      "div",
      {
        style: {
          width: w,
          height: w * 1.4,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: `${8 * u}px ${9 * u}px`,
          background: "#efe7da",
          border: `${3 * u}px solid #1b1527`,
          borderRadius: 10 * u,
          boxShadow: `${8 * u}px ${8 * u}px 0 #ff6a4d`,
          transform: "rotate(-8deg)",
          color: "#1b1527",
        },
      },
      h("div", { style: { fontSize: 44 * u, fontWeight: 800, lineHeight: 0.85, fontFamily: "sans-serif" } }, "A"),
      h("svg", { viewBox: "0 0 24 24", width: 58 * u, height: 58 * u, style: { alignSelf: "flex-end" } }, h("path", { d: SPADE, fill: "#1b1527" })),
    ),
  );
}

const targets = [
  ["icon-192.png", 192, 0.42],
  ["icon-512.png", 512, 0.42],
  ["icon-maskable-512.png", 512, 0.34],
  ["apple-icon.png", 180, 0.42],
];

for (const [file, size, scale] of targets) {
  const response = new ImageResponse(icon(size, scale), { width: size, height: size });
  await writeFile(new URL(`../${file === "apple-icon.png" ? "app" : "public"}/${file}`, import.meta.url), Buffer.from(await response.arrayBuffer()));
  console.log("wrote", file);
}
