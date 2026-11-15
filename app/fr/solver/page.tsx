import { toolMetadata } from "@/app/root-shell";
import { SolverPage } from "@/app/solver/solver-page";

export const metadata = toolMetadata("fr", "solver");

export default function Page() {
  return <SolverPage locale="fr" />;
}
