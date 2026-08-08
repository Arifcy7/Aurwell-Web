"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  ArrowLeft,
  Lock,
  Mail,
  Copy,
  Check,
  FileText,
  Clock,
  Server,
  UserCheck,
  Cookie,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

export default function PrivacyPolicyPage() {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.aurwell.app";
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [activeSection, setActiveSection] = useState("interpretation");

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("contact@aurwell.app");
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const navSections = [
    { id: "interpretation", label: "1. Interpretation & Definitions" },
    { id: "collecting-data", label: "2. Collecting & Using Personal Data" },
    { id: "tracking-cookies", label: "3. Tracking & Cookies Policy" },
    { id: "use-of-data", label: "4. Use of Your Personal Data" },
    { id: "retention-transfer", label: "5. Data Retention & Transfers" },
    { id: "delete-data", label: "6. Delete Your Personal Data" },
    { id: "disclosure-security", label: "7. Disclosure & Data Security" },
    { id: "children-privacy", label: "8. Children's Privacy" },
    { id: "changes-contact", label: "9. Policy Changes & Contact Us" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      for (const section of navSections) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
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

      {/* Hero Banner Section */}
      <section className="relative bg-white border-b border-neutral-200/60 py-12 sm:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-neutral-700" />
              Legal & Transparency
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-neutral-900 tracking-tight leading-tight">
              Privacy Policy
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-neutral-500 pt-1">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-neutral-400" />
                Last updated: August 8, 2026
              </span>
              <span className="w-1 h-1 rounded-full bg-neutral-300" />
              <span>Applies to Aurwell Web & Mobile Platform</span>
            </div>

            <p className="text-neutral-600 text-sm sm:text-base leading-relaxed pt-2">
              This Privacy Policy describes Our policies and procedures on the collection, use, and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You. We use Your Personal Data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Sticky Table of Contents (Desktop) */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-4">
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-neutral-500" />
                Table of Contents
              </h3>
              <nav className="space-y-1">
                {navSections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={() => setActiveSection(sec.id)}
                    className={`block px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeSection === sec.id
                        ? "bg-neutral-900 text-white shadow-xs"
                        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                    }`}
                  >
                    {sec.label}
                  </a>
                ))}
              </nav>
            </div>

            {/* Support Quick Contact Box */}
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-5 text-white shadow-md space-y-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Data Privacy Enquiries?</h4>
                <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                  Our compliance team is here to help with any data access, deletion, or privacy questions.
                </p>
              </div>
              <button
                onClick={handleCopyEmail}
                className="w-full py-2 px-3 rounded-xl bg-white text-neutral-900 text-xs font-bold hover:bg-neutral-100 transition-colors flex items-center justify-center gap-2"
              >
                {copiedEmail ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied contact@aurwell.app</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    <span>contact@aurwell.app</span>
                  </>
                )}
              </button>
            </div>
          </aside>

          {/* Right Main Legal Text Article */}
          <main className="lg:col-span-8 space-y-10 bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-10 shadow-xs">
            
            {/* Section 1: Interpretation and Definitions */}
            <section id="interpretation" className="space-y-6 scroll-mt-28">
              <div className="border-b border-neutral-100 pb-4">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Section 1</span>
                <h2 className="text-2xl font-extrabold text-neutral-900 mt-1">Interpretation and Definitions</h2>
              </div>

              <div className="space-y-4 text-sm text-neutral-700 leading-relaxed">
                <h3 className="text-base font-bold text-neutral-900">Interpretation</h3>
                <p>
                  The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.
                </p>

                <h3 className="text-base font-bold text-neutral-900 pt-2">Definitions</h3>
                <p>For the purposes of this Privacy Policy:</p>

                <div className="grid grid-cols-1 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                    <span className="font-bold text-neutral-900 text-xs uppercase tracking-wide bg-neutral-200/60 px-2 py-0.5 rounded-md mr-2">Account</span>
                    <span className="text-xs text-neutral-700">means a unique account created for You to access our Service or parts of our Service.</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                    <span className="font-bold text-neutral-900 text-xs uppercase tracking-wide bg-neutral-200/60 px-2 py-0.5 rounded-md mr-2">Affiliate</span>
                    <span className="text-xs text-neutral-700">means an entity that controls, is controlled by or is under common control with a party, where "control" means ownership of 50% or more of the shares, equity interest or other securities entitled to vote for election of directors or other managing authority.</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                    <span className="font-bold text-neutral-900 text-xs uppercase tracking-wide bg-neutral-200/60 px-2 py-0.5 rounded-md mr-2">Application</span>
                    <span className="text-xs text-neutral-700">refers to Aurwell, the software program and platform provided by the Company.</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                    <span className="font-bold text-neutral-900 text-xs uppercase tracking-wide bg-neutral-200/60 px-2 py-0.5 rounded-md mr-2">Company</span>
                    <span className="text-xs text-neutral-700">(referred to as either "the Company", "We", "Us" or "Our" in this Agreement) refers to Aurwell Technologies LLC.</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                    <span className="font-bold text-neutral-900 text-xs uppercase tracking-wide bg-neutral-200/60 px-2 py-0.5 rounded-md mr-2">Cookies</span>
                    <span className="text-xs text-neutral-700">are small files that are placed on Your computer, mobile device or any other device by a website, containing the details of Your browsing history on that website among its many uses.</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                    <span className="font-bold text-neutral-900 text-xs uppercase tracking-wide bg-neutral-200/60 px-2 py-0.5 rounded-md mr-2">Country</span>
                    <span className="text-xs text-neutral-700">refers to: Delaware, United States.</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                    <span className="font-bold text-neutral-900 text-xs uppercase tracking-wide bg-neutral-200/60 px-2 py-0.5 rounded-md mr-2">Device</span>
                    <span className="text-xs text-neutral-700">means any device that can access the Service such as a computer, a cellphone or a digital tablet.</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                    <span className="font-bold text-neutral-900 text-xs uppercase tracking-wide bg-neutral-200/60 px-2 py-0.5 rounded-md mr-2">Personal Data</span>
                    <span className="text-xs text-neutral-700">is any information that relates to an identified or identifiable individual.</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                    <span className="font-bold text-neutral-900 text-xs uppercase tracking-wide bg-neutral-200/60 px-2 py-0.5 rounded-md mr-2">Service</span>
                    <span className="text-xs text-neutral-700">refers to the Application or the Website or both.</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                    <span className="font-bold text-neutral-900 text-xs uppercase tracking-wide bg-neutral-200/60 px-2 py-0.5 rounded-md mr-2">Service Provider</span>
                    <span className="text-xs text-neutral-700">means any natural or legal person who processes the data on behalf of the Company. It refers to third-party companies or individuals employed by the Company to facilitate the Service, to provide the Service on behalf of the Company, to perform services related to the Service or to assist the Company in analyzing how the Service is used.</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                    <span className="font-bold text-neutral-900 text-xs uppercase tracking-wide bg-neutral-200/60 px-2 py-0.5 rounded-md mr-2">Usage Data</span>
                    <span className="text-xs text-neutral-700">refers to data collected automatically, either generated by the use of the Service or from the Service infrastructure itself (for example, the duration of a page visit).</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                    <span className="font-bold text-neutral-900 text-xs uppercase tracking-wide bg-neutral-200/60 px-2 py-0.5 rounded-md mr-2">Website</span>
                    <span className="text-xs text-neutral-700">refers to Aurwell, accessible from <a href="https://aurwell.app" target="_blank" rel="noopener noreferrer" className="text-neutral-900 font-bold underline underline-offset-2">https://aurwell.app</a></span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70">
                    <span className="font-bold text-neutral-900 text-xs uppercase tracking-wide bg-neutral-200/60 px-2 py-0.5 rounded-md mr-2">You</span>
                    <span className="text-xs text-neutral-700">means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Collecting and Using Your Personal Data */}
            <section id="collecting-data" className="space-y-6 scroll-mt-28 pt-6 border-t border-neutral-100">
              <div className="border-b border-neutral-100 pb-4">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Section 2</span>
                <h2 className="text-2xl font-extrabold text-neutral-900 mt-1">Collecting and Using Your Personal Data</h2>
              </div>

              <div className="space-y-4 text-sm text-neutral-700 leading-relaxed">
                <h3 className="text-base font-bold text-neutral-900">Types of Data Collected</h3>
                
                <div className="space-y-2">
                  <h4 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-neutral-700" />
                    Personal Data
                  </h4>
                  <p>
                    While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You. Personally identifiable information may include, but is not limited to:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm pl-2 text-neutral-800 font-medium">
                    <li>Email address</li>
                    <li>First name and last name</li>
                    <li>Phone number</li>
                    <li>Clinic or Business Name and Address details</li>
                  </ul>
                </div>

                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                    <Server className="w-4 h-4 text-neutral-700" />
                    Usage Data
                  </h4>
                  <p>
                    Usage Data is collected automatically when using the Service.
                  </p>
                  <p>
                    Usage Data may include information such as Your Device's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that You visit, the time and date of Your visit, the time spent on those pages, unique device identifiers and other diagnostic data.
                  </p>
                  <p>
                    When You access the Service by or through a mobile device, We may collect certain information automatically, including, but not limited to, the type of mobile device You use, Your mobile device unique ID, the IP address of Your mobile device, Your mobile operating system, the type of mobile Internet browser You use, unique device identifiers and other diagnostic data. We may also collect information that Your browser sends whenever You visit our Service or when You access the Service by or through a mobile device.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3: Tracking Technologies and Cookies */}
            <section id="tracking-cookies" className="space-y-6 scroll-mt-28 pt-6 border-t border-neutral-100">
              <div className="border-b border-neutral-100 pb-4">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Section 3</span>
                <h2 className="text-2xl font-extrabold text-neutral-900 mt-1">Tracking Technologies and Cookies</h2>
              </div>

              <div className="space-y-4 text-sm text-neutral-700 leading-relaxed">
                <p>
                  We use Cookies and similar tracking technologies to track the activity on Our Service and store certain information. Tracking technologies used are beacons, tags, and scripts to collect and track information and to improve and analyze Our Service. The technologies We use may include:
                </p>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1">
                    <h4 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                      <Cookie className="w-4 h-4 text-neutral-800" />
                      Cookies or Browser Cookies
                    </h4>
                    <p className="text-xs text-neutral-600">
                      A cookie is a small file placed on Your Device. You can instruct Your browser to refuse all Cookies or to indicate when a Cookie is being sent. However, if You do not accept Cookies, You may not be able to use some parts of our Service. Unless you have adjusted Your browser setting so that it will refuse Cookies, our Service may use Cookies.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1">
                    <h4 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-neutral-800" />
                      Web Beacons
                    </h4>
                    <p className="text-xs text-neutral-600">
                      Certain sections of our Service and our emails may contain small electronic files known as web beacons (also referred to as clear gifs, pixel tags, and single-pixel gifs) that permit the Company, for example, to count users who have visited those pages or opened an email and for other related website statistics (for example, recording the popularity of a certain section and verifying system and server integrity).
                    </p>
                  </div>
                </div>

                <p className="pt-2">
                  Cookies can be "Persistent" or "Session" Cookies. Persistent Cookies remain on Your personal computer or mobile device when You go offline, while Session Cookies are deleted as soon as You close Your web browser. We use both Session and Persistent Cookies for the purposes set out below:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-2xs space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">Necessary / Essential</span>
                    <h4 className="font-bold text-xs text-neutral-900">Session Cookies</h4>
                    <p className="text-xs text-neutral-600 leading-normal">
                      Administered by Us. These Cookies are essential to provide You with services available through the Website and to enable You to use some of its features.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-2xs space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">Cookies Notice Acceptance</span>
                    <h4 className="font-bold text-xs text-neutral-900">Persistent Cookies</h4>
                    <p className="text-xs text-neutral-600 leading-normal">
                      Administered by Us. These Cookies identify if users have accepted the use of cookies on the Website.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-2xs space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">Functionality Cookies</span>
                    <h4 className="font-bold text-xs text-neutral-900">Persistent Cookies</h4>
                    <p className="text-xs text-neutral-600 leading-normal">
                      Administered by Us. These Cookies allow us to remember choices You make when You use the Website, such as login details or language preferences.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Use of Your Personal Data */}
            <section id="use-of-data" className="space-y-6 scroll-mt-28 pt-6 border-t border-neutral-100">
              <div className="border-b border-neutral-100 pb-4">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Section 4</span>
                <h2 className="text-2xl font-extrabold text-neutral-900 mt-1">Use of Your Personal Data</h2>
              </div>

              <div className="space-y-4 text-sm text-neutral-700 leading-relaxed">
                <p>The Company may use Personal Data for the following purposes:</p>

                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">✓</div>
                    <div>
                      <strong className="text-neutral-900">To provide and maintain our Service:</strong> including to monitor the usage of our Service.
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">✓</div>
                    <div>
                      <strong className="text-neutral-900">To manage Your Account:</strong> to manage Your registration as a user of the Service. The Personal Data You provide can give You access to different functionalities of the Service that are available to You as a registered user.
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">✓</div>
                    <div>
                      <strong className="text-neutral-900">For the performance of a contract:</strong> the development, compliance and undertaking of the purchase contract for the products, items or services You have purchased or of any other contract with Us through the Service.
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">✓</div>
                    <div>
                      <strong className="text-neutral-900">To contact You:</strong> To contact You by email, telephone calls, SMS, or other equivalent forms of electronic communication, such as a mobile application's push notifications regarding updates or informative communications related to the functionalities, products or contracted services, including security updates, when necessary or reasonable for their implementation.
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">✓</div>
                    <div>
                      <strong className="text-neutral-900">To provide You with news and special offers:</strong> general information about other goods, services and events which we offer that are similar to those that you have already purchased or enquired about unless You have opted not to receive such information.
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">✓</div>
                    <div>
                      <strong className="text-neutral-900">To manage Your requests:</strong> To attend and manage Your requests to Us.
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">✓</div>
                    <div>
                      <strong className="text-neutral-900">For business transfers:</strong> We may use Your information to evaluate or conduct a merger, divestiture, restructuring, reorganization, dissolution, or other sale or transfer of some or all of Our assets, whether as a going concern or as part of bankruptcy, liquidation, or similar proceeding.
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">✓</div>
                    <div>
                      <strong className="text-neutral-900">For other business purposes:</strong> such as data analysis, identifying usage trends, determining the effectiveness of our promotional campaigns and evaluating and improving our Service, products, marketing and your experience.
                    </div>
                  </li>
                </ul>

                <p className="pt-2 font-bold text-neutral-900">We may share Your personal information in the following situations:</p>

                <ul className="list-disc list-inside space-y-1.5 pl-2 text-neutral-700">
                  <li><strong>With Service Providers:</strong> We may share Your personal information with Service Providers to monitor and analyze the use of our Service, or to contact You.</li>
                  <li><strong>For business transfers:</strong> We may share or transfer Your personal information in connection with, or during negotiations of, any merger, sale of Company assets, financing, or acquisition of all or a portion of Our business to another company.</li>
                  <li><strong>With Affiliates:</strong> We may share Your information with Our affiliates, requiring those affiliates to honor this Privacy Policy.</li>
                  <li><strong>With business partners:</strong> We may share Your information with Our business partners to offer You certain products, services or promotions.</li>
                  <li><strong>With other users:</strong> when You share personal information or otherwise interact in public areas with other users.</li>
                  <li><strong>With Your consent:</strong> We may disclose Your personal information for any other purpose with Your explicit consent.</li>
                </ul>
              </div>
            </section>

            {/* Section 5: Retention and Transfer of Your Personal Data */}
            <section id="retention-transfer" className="space-y-6 scroll-mt-28 pt-6 border-t border-neutral-100">
              <div className="border-b border-neutral-100 pb-4">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Section 5</span>
                <h2 className="text-2xl font-extrabold text-neutral-900 mt-1">Retention & Transfer of Your Personal Data</h2>
              </div>

              <div className="space-y-4 text-sm text-neutral-700 leading-relaxed">
                <h3 className="text-base font-bold text-neutral-900">Retention of Your Personal Data</h3>
                <p>
                  The Company will retain Your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use Your Personal Data to the extent necessary to comply with our legal obligations (for example, if we are required to retain your data to comply with applicable laws), resolve disputes, and enforce our legal agreements and policies.
                </p>
                <p>
                  The Company will also retain Usage Data for internal analysis purposes. Usage Data is generally retained for a shorter period of time, except when this data is used to strengthen the security or to improve the functionality of Our Service, or We are legally obligated to retain this data for longer time periods.
                </p>

                <h3 className="text-base font-bold text-neutral-900 pt-2">Transfer of Your Personal Data</h3>
                <p>
                  Your information, including Personal Data, is processed at the Company's operating offices and in any other places where the parties involved in the processing are located. It means that this information may be transferred to — and maintained on — computers located outside of Your state, province, country or other governmental jurisdiction where the data protection laws may differ than those from Your jurisdiction.
                </p>
                <p>
                  Your consent to this Privacy Policy followed by Your submission of such information represents Your agreement to that transfer. The Company will take all steps reasonably necessary to ensure that Your data is treated securely and in accordance with this Privacy Policy and no transfer of Your Personal Data will take place to an organization or a country unless there are adequate controls in place including the security of Your data and other personal information.
                </p>
              </div>
            </section>

            {/* Section 6: Delete Your Personal Data */}
            <section id="delete-data" className="space-y-6 scroll-mt-28 pt-6 border-t border-neutral-100">
              <div className="border-b border-neutral-100 pb-4">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Section 6</span>
                <h2 className="text-2xl font-extrabold text-neutral-900 mt-1">Delete Your Personal Data</h2>
              </div>

              <div className="space-y-4 text-sm text-neutral-700 leading-relaxed">
                <p>
                  You have the right to delete or request that We assist in deleting the Personal Data that We have collected about You.
                </p>
                <p>
                  Our Service may give You the ability to delete certain information about You from within the Service. You may update, amend, or delete Your information at any time by signing in to Your Account, if you have one, and visiting the account settings section that allows you to manage Your personal information.
                </p>

                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 space-y-1">
                    <p className="font-bold">Request Assistance or Legal Obligations</p>
                    <p>
                      You may also contact Us directly to request access to, correct, or delete any personal information that You have provided to Us. Please note, however, that We may need to retain certain information when we have a legal obligation or lawful basis to do so.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 7: Disclosure and Security of Personal Data */}
            <section id="disclosure-security" className="space-y-6 scroll-mt-28 pt-6 border-t border-neutral-100">
              <div className="border-b border-neutral-100 pb-4">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Section 7</span>
                <h2 className="text-2xl font-extrabold text-neutral-900 mt-1">Disclosure & Security of Your Personal Data</h2>
              </div>

              <div className="space-y-4 text-sm text-neutral-700 leading-relaxed">
                <h3 className="text-base font-bold text-neutral-900">Disclosure of Your Personal Data</h3>
                
                <div className="space-y-3">
                  <p><strong>Business Transactions:</strong> If the Company is involved in a merger, acquisition or asset sale, Your Personal Data may be transferred. We will provide notice before Your Personal Data is transferred and becomes subject to a different Privacy Policy.</p>

                  <p><strong>Law Enforcement:</strong> Under certain circumstances, the Company may be required to disclose Your Personal Data if required to do so by law or in response to valid requests by public authorities (e.g. a court or a government agency).</p>

                  <p><strong>Other Legal Requirements:</strong> The Company may disclose Your Personal Data in the good faith belief that such action is necessary to:</p>
                  <ul className="list-disc list-inside space-y-1 pl-2 text-xs sm:text-sm text-neutral-700">
                    <li>Comply with a legal obligation</li>
                    <li>Protect and defend the rights or property of the Company</li>
                    <li>Prevent or investigate possible wrongdoing in connection with the Service</li>
                    <li>Protect the personal safety of Users of the Service or the public</li>
                    <li>Protect against legal liability</li>
                  </ul>
                </div>

                <h3 className="text-base font-bold text-neutral-900 pt-4">Security of Your Personal Data</h3>
                <p>
                  The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While We strive to use commercially acceptable means to protect Your Personal Data, We cannot guarantee its absolute security.
                </p>
              </div>
            </section>

            {/* Section 8: Children's Privacy */}
            <section id="children-privacy" className="space-y-6 scroll-mt-28 pt-6 border-t border-neutral-100">
              <div className="border-b border-neutral-100 pb-4">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Section 8</span>
                <h2 className="text-2xl font-extrabold text-neutral-900 mt-1">Children's Privacy</h2>
              </div>

              <div className="space-y-4 text-sm text-neutral-700 leading-relaxed">
                <p>
                  Our Service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from anyone under the age of 13. If You are a parent or guardian and You are aware that Your child has provided Us with Personal Data, please contact Us.
                </p>
                <p>
                  If We become aware that We have collected Personal Data from anyone under the age of 13 without verification of parental consent, We take steps to remove that information from Our servers.
                </p>
                <p>
                  If We need to rely on consent as a legal basis for processing Your information and Your country requires consent from a parent, We may require Your parent's consent before We collect and use that information.
                </p>
              </div>
            </section>

            {/* Section 9: Policy Changes and Contact Us */}
            <section id="changes-contact" className="space-y-6 scroll-mt-28 pt-6 border-t border-neutral-100">
              <div className="border-b border-neutral-100 pb-4">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Section 9</span>
                <h2 className="text-2xl font-extrabold text-neutral-900 mt-1">Policy Changes & Contact Us</h2>
              </div>

              <div className="space-y-4 text-sm text-neutral-700 leading-relaxed">
                <h3 className="text-base font-bold text-neutral-900">Links to Other Websites</h3>
                <p>
                  Our Service may contain links to other websites that are not operated by Us. If You click on a third party link, You will be directed to that third party's site. We strongly advise You to review the Privacy Policy of every site You visit. We have no control over and assume no responsibility for the content, privacy policies or practices of any third party sites or services.
                </p>

                <h3 className="text-base font-bold text-neutral-900 pt-2">Changes to this Privacy Policy</h3>
                <p>
                  We may update Our Privacy Policy from time to time. We will notify You of any changes by posting the new Privacy Policy on this page. We will let You know via email and/or a prominent notice on Our Service, prior to the change becoming effective and update the "Last updated" date at the top of this Privacy Policy.
                </p>
                <p>
                  You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
                </p>

                {/* Contact Card */}
                <div className="mt-6 p-6 rounded-3xl bg-neutral-900 text-white space-y-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-white/10 text-white">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base">Contact Our Privacy Office</h4>
                      <p className="text-xs text-neutral-300">If you have any questions about this Privacy Policy, You can contact us:</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                    <a
                      href="mailto:contact@aurwell.app"
                      className="px-5 py-3 rounded-2xl bg-white text-neutral-900 font-bold text-xs hover:bg-neutral-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <span>Send Email: contact@aurwell.app</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={handleCopyEmail}
                      className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-white/10"
                    >
                      {copiedEmail ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied Email</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Address</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </section>

          </main>
        </div>
      </div>

      {/* Footer (Matching website landing page) */}
      <footer className="w-full bg-[#F3F4F6] border-t border-neutral-200/60 mt-16 pt-12">
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
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Company & Legal</h4>
            <ul className="space-y-2 text-xs text-neutral-500">
              <li>
                <Link href="/privacy" className="font-bold text-neutral-900 hover:text-neutral-900 transition-colors flex items-center gap-1">
                  Privacy Policy
                  <ChevronRight className="w-3 h-3 text-neutral-400" />
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-neutral-900 transition-colors">
                  Contact Support
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
