import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact & Live Walkthrough Demo — Aurwell",
  description:
    "Schedule a live personalized 1-on-1 walkthrough demo with our product team or get in touch regarding Aurwell's clinical mobile app platform.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact & Live Walkthrough Demo — Aurwell",
    description:
      "Schedule a live personalized 1-on-1 walkthrough demo with our product team or get in touch regarding Aurwell's clinical mobile app platform.",
    url: "/contact",
    siteName: "Aurwell",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact & Live Walkthrough Demo — Aurwell",
    description:
      "Schedule a live personalized 1-on-1 walkthrough demo with our product team or get in touch regarding Aurwell's clinical mobile app platform.",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
