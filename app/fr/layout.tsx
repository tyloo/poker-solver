import type { ReactNode } from "react";
import { RootShell, rootMetadata, rootViewport } from "@/app/root-shell";

export const metadata = rootMetadata("fr");
export const viewport = rootViewport;

export default function FrenchLayout({ children }: { children: ReactNode }) {
  return <RootShell locale="fr">{children}</RootShell>;
}
