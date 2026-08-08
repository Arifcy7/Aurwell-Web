"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mail,
  Copy,
  Check,
  ArrowLeft,
  MessageSquare,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ExternalLink,
} from "lucide-react";

export default function ContactPage() {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.aurwell.app";

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("contact@aurwell.app");
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const faqs = [
    {
      q: "How fast can my clinic app be launched?",
      a: "With Aurwell, your custom-branded mobile app is ready within 24 hours after submitting your clinic branding and service details.",
    },
    {
      q: "Can I import logo, colors, and treatments from my website?",
      a: "Yes! Aurwell features automated website brand import that pulls your clinic logo, color palette, fonts, and treatment details seamlessly.",
    },
    {
      q: "What is included in the Aurwell Partner Referral Program?",
      a: "You can earn 30% recurring monthly commission on every aesthetic clinic owner you refer to Aurwell for as long as their subscription remains active.",
    },
    {
      q: "How do I schedule a live walkthrough demo?",
      a: "Email us directly at contact@aurwell.app with your clinic name and preferred time. Our product team will arrange a 1-on-1 personalized video walkthrough.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white flex flex-col">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <Image
                src="/logo-black.png"
                alt="Aurwell Logo"
                width={130}
                height={34}
                className="h-7 w-auto object-contain"
                priority
              />
            </Link>
            <span className="hidden sm:inline-block w-px h-5 bg-neutral-300" />
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`${adminUrl}/login`}
              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-semibold px-3 py-1.5 rounded-full text-xs transition-all"
            >
              Login
            </Link>
            <Link
              href={`${adminUrl}/signup`}
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-4 py-1.5 rounded-full text-xs shadow-sm transition-all"
            >
              Build App
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative bg-white border-b border-neutral-200/60 py-14 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-bold uppercase tracking-wider mx-auto">
              <MessageSquare className="w-4 h-4 text-neutral-700" />
              Direct Communication
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-neutral-900 tracking-tight leading-tight">
              Get in Touch with Aurwell
            </h1>

            <p className="text-neutral-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-normal">
              Have questions about building your aesthetic clinic app, custom branding, enterprise partnerships, or support? Email us directly and our team will get right back to you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex-1 space-y-12 w-full">
        
        {/* Direct Email Contact Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 text-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-neutral-800 text-center space-y-6 relative overflow-hidden"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/10 text-white flex items-center justify-center mx-auto shadow-inner">
            <Mail className="w-8 h-8 text-white" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Official Contact Email</span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white font-mono">
              contact@aurwell.app
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-normal pt-1">
              Reach out directly to our product, sales, and support team. We review all incoming emails promptly.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 max-w-md mx-auto">
            <a
              href="mailto:contact@aurwell.app"
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-black text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Send Email Now</span>
              <ExternalLink className="w-4 h-4 text-neutral-950" />
            </a>

            <button
              onClick={handleCopyEmail}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm transition-all border border-white/15 flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiedEmail ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Email Address Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Address</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Quick FAQ Accordion */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-10 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
            <div className="p-2.5 rounded-2xl bg-neutral-100 text-neutral-800">
              <HelpCircle className="w-5 h-5 text-neutral-800" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-neutral-900">
                Frequently Asked Questions
              </h3>
              <p className="text-xs text-neutral-500">Quick answers to common questions about Aurwell.</p>
            </div>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-neutral-200/70 bg-neutral-50/50 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-4 flex items-center justify-between text-left gap-3 hover:bg-neutral-100/60 transition cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-bold text-neutral-900 leading-snug">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform duration-200 ${
                      openFaq === idx ? "rotate-180 text-neutral-900" : ""
                    }`}
                  />
                </button>

                {openFaq === idx && (
                  <div className="px-4 pb-4 text-xs sm:text-sm text-neutral-600 leading-relaxed border-t border-neutral-200/40 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="w-full bg-[#F3F4F6] border-t border-neutral-200/60 mt-auto pt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-8">
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-black.png"
                alt="Aurwell Logo"
                width={130}
                height={36}
                className="h-7 w-auto object-contain"
              />
              <Image
                src="/typo.png"
                alt="Aurwell Typography"
                width={120}
                height={32}
                className="h-5 w-auto object-contain transform translate-y-[1px]"
              />
            </div>
            <p className="text-xs text-neutral-500 max-w-sm">
              Aurwell – your intelligent wellness companion and premium clinical treatment platform.
            </p>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Product</h4>
            <ul className="space-y-2 text-xs text-neutral-500">
              <li>
                <Link href="/#overview" className="hover:text-neutral-900 transition-colors">
                  Overview
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-neutral-900 transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-neutral-900 transition-colors">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-xs text-neutral-500">
              <li>
                <Link href="/contact" className="font-bold text-neutral-900 hover:text-neutral-900 transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-neutral-900 transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t border-neutral-200/80 text-xs text-neutral-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© 2026 Aurwell. All rights reserved.</span>
          <div className="flex items-center gap-4 text-neutral-500">
            <Link href="/privacy" className="hover:text-neutral-900">Privacy Policy</Link>
            <span>•</span>
            <a href="mailto:contact@aurwell.app" className="hover:text-neutral-900">contact@aurwell.app</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
