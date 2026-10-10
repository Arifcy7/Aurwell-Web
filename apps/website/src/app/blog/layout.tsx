import type { Metadata } from "next";
import { Newsreader } from "next/font/google";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Aurwell Journal — Minimalist Clinical & Wellness Perspectives",
  description:
    "Refined insights on clinic growth, branded patient apps, and modern medical aesthetics.",
  alternates: {
    canonical: "/blog",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Aurwell Journal — Minimalist Clinical & Wellness Perspectives",
    description:
      "Refined insights on clinic growth, branded patient apps, and modern medical aesthetics.",
    url: "/blog",
    siteName: "Aurwell",
    type: "website",
    images: [
      {
        url: "/green-hero-image.png",
        width: 1200,
        height: 630,
        alt: "Aurwell Journal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aurwell Journal — Minimalist Clinical & Wellness Perspectives",
    description:
      "Refined insights on clinic growth, branded patient apps, and modern medical aesthetics.",
    images: ["/green-hero-image.png"],
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${newsreader.variable} min-h-screen bg-[#f7f9f6] text-[#1b251d] font-sans antialiased selection:bg-[#d9e8dc] selection:text-[#18291b]`}
    >
      {children}
    </div>
  );
}
