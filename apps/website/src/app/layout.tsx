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

export const metadata: Metadata = {
  title: "Aurwell – Your Intelligent Wellness Companion",
  description: "Aurwell – your intelligent wellness companion and premium clinical treatment app.",
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
        {children}
      </body>
    </html>
  );
}
