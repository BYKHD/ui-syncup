import type { PlanOption } from "../types";

// All available plans
export const planOptions: PlanOption[] = [
  {
    id: "starter",
    label: "Starter",
    price: "Free",
    description: "Collect feedback from early adopters.",
    features: ["Up to 2 seats", "Email summaries", "Community support"],
  },
  {
    id: "team",
    label: "Team",
    price: "$24 / seat",
    description: "Best for product squads shipping weekly.",
    features: [
      "Unlimited feedback streams",
      "Reviewer workflows",
      "Slack + Jira sync",
    ],
  },
  {
    id: "enterprise",
    label: "Enterprise",
    price: "Let's chat",
    description: "Governance and custom success planning.",
    features: [
      "Dedicated CSM",
      "SSO + SCIM",
      "Custom retention policies",
    ],
  },
];

// Onboarding plans (Free and Pro only)
export const onboardingPlanOptions: PlanOption[] = [
  {
    id: "starter",
    label: "Free",
    price: "$0",
    description: "Perfect for trying out the platform.",
    features: ["Up to 3 team members", "5 projects", "Basic analytics"],
  },
  {
    id: "team",
    label: "Pro",
    price: "$29/month",
    description: "For teams ready to scale.",
    features: [
      "Unlimited team members",
      "Unlimited projects",
      "Advanced analytics",
      "Priority support",
    ],
  },
];
