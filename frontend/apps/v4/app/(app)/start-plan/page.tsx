import { type Metadata } from "next"
import { StartPlanClient } from "./start-plan-client"

export const metadata: Metadata = {
  title: "Start Plan",
  description: "Choose a subscription plan to unlock full movie details.",
}

export default function StartPlanPage() {
  return <StartPlanClient />
}
