import { manifestResponse } from "@/lib/i18n/manifest";

export const dynamic = "force-static";

export function GET() {
  return manifestResponse("fr");
}
