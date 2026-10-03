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
