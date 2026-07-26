import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aurwell – Your Intelligent Wellness Companion",
  description: "Aurwell – your intelligent wellness companion and premium clinical treatment app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} font-sans h-full antialiased`}
    >
      <body className={`${inter.className} min-h-full flex flex-col font-sans`}>
        {children}
      </body>
    </html>
  );
}
