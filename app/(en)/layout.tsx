import type { ReactNode } from "react";
import { RootShell, rootMetadata, rootViewport } from "@/app/root-shell";

export const metadata = rootMetadata("en");
export const viewport = rootViewport;

export default function EnglishLayout({ children }: { children: ReactNode }) {
  return <RootShell locale="en">{children}</RootShell>;
}
