import { RangesPage } from "@/app/ranges/ranges-page";
import { toolMetadata } from "@/app/root-shell";

export const metadata = toolMetadata("fr", "ranges");

export default function Page() {
  return <RangesPage locale="fr" />;
}
