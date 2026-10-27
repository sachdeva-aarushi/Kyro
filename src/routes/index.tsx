import { createFileRoute } from "@tanstack/react-router";
import { KyroWorkspace } from "@/components/kyro/kyro-workspace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kyro — Healthcare Vendor Intelligence" },
      {
        name: "description",
        content:
          "A local demonstration of evidence-led healthcare vendor assessment for a fictional hospital network. All organizations, findings, documents, and activity are simulated.",
      },
      { property: "og:title", content: "Kyro — Healthcare Vendor Intelligence" },
      {
        property: "og:description",
        content:
          "Explore a fictional, evidence-led healthcare vendor review workspace. Demo data is local and simulated.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KyroWorkspace,
});
