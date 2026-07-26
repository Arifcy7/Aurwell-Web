import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { FirebaseProvider } from "@/components/providers/FirebaseProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aurwell Admin Portal",
  description: "Admin dashboard and management panel for Aurwell.",
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
        <FirebaseProvider>{children}</FirebaseProvider>
      </body>
    </html>
  );
}
