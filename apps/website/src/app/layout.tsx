import type { Metadata } from "next";
import { Inter, Shadows_Into_Light } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const shadowsIntoLight = Shadows_Into_Light({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-shadows-into-light",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aurwell.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Aurwell — Branded Mobile Apps & Patient Retention for Aesthetic Clinics",
    template: "%s | Aurwell",
  },
  description:
    "Launch a custom-branded mobile app for your aesthetic clinic or medical spa in 24 hours. Automate patient booking, VIP reward tiers, memberships, and retention on autopilot.",
  keywords: [
    "aesthetic clinic app",
    "medspa patient retention",
    "custom clinic mobile app",
    "medical spa loyalty software",
    "clinic booking app",
    "aesthetic practice management",
    "patient loyalty app",
    "cosmetic dermatology software",
    "Aurwell",
  ],
  authors: [{ name: "Aurwell", url: siteUrl }],
  creator: "Aurwell",
  publisher: "Aurwell",
  alternates: {
    canonical: "/",
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
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Aurwell",
    title: "Aurwell — Branded Mobile Apps & Patient Retention for Aesthetic Clinics",
    description:
      "Turn first-time clinic treatments into recurring revenue. Custom iOS & Android mobile apps, automated rewards, and booking tailored for medical aesthetics.",
    images: [
      {
        url: "/green-hero-image.png",
        width: 1200,
        height: 630,
        alt: "Aurwell — Aesthetic Clinic Patient App & Retention Software",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aurwell — Branded Mobile Apps & Patient Retention for Aesthetic Clinics",
    description:
      "Turn first-time clinic treatments into recurring revenue with custom branded mobile apps and automated VIP rewards.",
    images: ["/green-hero-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "android-chrome-192x192",
        url: "/android-chrome-192x192.png",
      },
      {
        rel: "android-chrome-512x512",
        url: "/android-chrome-512x512.png",
      },
    ],
  },
  manifest: "/site.webmanifest",
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Aurwell",
  url: siteUrl,
  logo: `${siteUrl}/logo-black.png`,
  description:
    "Intelligent wellness companion and branded patient retention platform for aesthetic clinics and medical spas.",
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Aurwell",
  url: siteUrl,
  description:
    "Bespoke branded mobile apps, automated VIP memberships, and patient retention software for aesthetic clinics and medical spas.",
};

import { Suspense } from "react";
import { BookingProvider } from "@/components/booking/BookingProvider";
import { FirebaseAnalyticsProvider } from "@/components/analytics/FirebaseAnalyticsProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${shadowsIntoLight.variable} font-sans h-full antialiased scroll-smooth`}
    >
      <body className={`${inter.className} min-h-full flex flex-col font-sans`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <Suspense fallback={null}>
          <FirebaseAnalyticsProvider />
        </Suspense>
        <BookingProvider>{children}</BookingProvider>
      </body>
    </html>
  );
}

