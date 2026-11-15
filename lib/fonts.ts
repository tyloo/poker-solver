import { Atkinson_Hyperlegible_Next, Big_Shoulders } from "next/font/google";

// Next has no fallback metrics for these families, so fallback adjustment is disabled.
export const bigShoulders = Big_Shoulders({ subsets: ["latin"], variable: "--font-big-shoulders", adjustFontFallback: false, fallback: ["Arial Narrow", "sans-serif"] });
export const atkinson = Atkinson_Hyperlegible_Next({ subsets: ["latin"], variable: "--font-atkinson", adjustFontFallback: false, fallback: ["system-ui", "sans-serif"] });
