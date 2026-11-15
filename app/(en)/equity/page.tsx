import { EquityPage } from "@/app/equity/equity-page";
import { toolMetadata } from "@/app/root-shell";

export const metadata = toolMetadata("en", "equity");

export default function Page() {
  return <EquityPage locale="en" />;
}
