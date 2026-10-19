import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Aurwell",
  description:
    "Review Aurwell's Privacy Policy and data protection standards for aesthetic clinics, practitioners, and patients.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy — Aurwell",
    description:
      "Review Aurwell's Privacy Policy and data protection standards for aesthetic clinics, practitioners, and patients.",
    url: "/privacy",
    siteName: "Aurwell",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy — Aurwell",
    description:
      "Review Aurwell's Privacy Policy and data protection standards for aesthetic clinics, practitioners, and patients.",
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
