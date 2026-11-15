import { GlossaryPage } from "@/app/glossary/glossary-page";
import { toolMetadata } from "@/app/root-shell";

export const metadata = toolMetadata("en", "glossary");

export default function Page() {
  return <GlossaryPage locale="en" />;
}
