"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  getFirebaseAnalytics,
  logPageView,
  logScrollDepth,
  logSectionView,
  logCtaClick,
} from "@/lib/firebase/analytics";

export function FirebaseAnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firedScrollThresholds = useRef<Set<number>>(new Set());
  const firedSectionViews = useRef<Set<string>>(new Set());

  // Initialize Firebase Analytics on mount
  useEffect(() => {
    getFirebaseAnalytics();
  }, []);

  // 1. Page View & Traffic Tracking
  useEffect(() => {
    if (!pathname) return;

    // Reset scroll & section tracking for new page view
    firedScrollThresholds.current.clear();
    firedSectionViews.current.clear();

    // Log page view after short microtask to allow document.title to update
    const timer = setTimeout(() => {
      logPageView(pathname, document.title);
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  // 2. Scroll Depth Tracking (25%, 50%, 75%, 90%, 100%)
  useEffect(() => {
    const thresholds = [25, 50, 75, 90, 100];

    const handleScroll = () => {
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const scrollableHeight = docHeight - winHeight;

      if (scrollableHeight <= 0) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollPercent = Math.min(
        100,
        Math.max(0, Math.round((scrollTop / scrollableHeight) * 100))
      );

      for (const threshold of thresholds) {
        if (scrollPercent >= threshold && !firedScrollThresholds.current.has(threshold)) {
          firedScrollThresholds.current.add(threshold);
          logScrollDepth(threshold, pathname);
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Check initial scroll in case user reloaded midway down
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [pathname]);

  // 3. Section Visibility Tracking (IntersectionObserver)
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    const timerMap = new Map<Element, NodeJS.Timeout>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target;
          const sectionId =
            target.getAttribute("data-analytics-section") ||
            target.getAttribute("id") ||
            "unknown-section";
          const sectionTitle =
            target.getAttribute("data-analytics-title") ||
            sectionId.replace(/[-_]/g, " ");

          if (entry.isIntersecting) {
            // Require 1 second continuous visibility to avoid scroll-through spam
            if (!timerMap.has(target) && !firedSectionViews.current.has(sectionId)) {
              const timer = setTimeout(() => {
                if (!firedSectionViews.current.has(sectionId)) {
                  firedSectionViews.current.add(sectionId);
                  logSectionView(sectionId, sectionTitle);
                }
              }, 1000);
              timerMap.set(target, timer);
            }
          } else {
            // Cancel timer if user scrolled away before 1s
            if (timerMap.has(target)) {
              clearTimeout(timerMap.get(target));
              timerMap.delete(target);
            }
          }
        });
      },
      {
        threshold: 0.25, // 25% of section visible
      }
    );

    // Observe elements with data-analytics-section or section elements with id
    const updateObservedElements = () => {
      const elements = document.querySelectorAll(
        "[data-analytics-section], section[id]"
      );
      elements.forEach((el) => observer.observe(el));
    };

    updateObservedElements();

    // Re-check after DOM renders full page content
    const initTimer = setTimeout(updateObservedElements, 800);

    return () => {
      clearTimeout(initTimer);
      timerMap.forEach((timer) => clearTimeout(timer));
      observer.disconnect();
    };
  }, [pathname]);

  // 4. Global CTA Click Listener
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Find closest element with data-cta-name or button/link element
      const ctaElement = target.closest<HTMLElement>(
        "[data-cta-name], button, a, [role='button']"
      );
      if (!ctaElement) return;

      // If explicit data-cta-name exists
      const explicitCtaName = ctaElement.getAttribute("data-cta-name");
      const explicitLocation =
        ctaElement.getAttribute("data-cta-location") || "page";

      if (explicitCtaName) {
        logCtaClick({
          ctaName: explicitCtaName,
          ctaLocation: explicitLocation,
          ctaUrl: ctaElement.getAttribute("href") || undefined,
          ctaType: ctaElement.tagName.toLowerCase(),
        });
        return;
      }

      // Auto-detect CTA clicks based on button/link text keywords
      const textContent = (ctaElement.textContent || "").trim();
      const href = ctaElement.getAttribute("href") || "";

      const ctaKeywords = [
        "book",
        "schedule",
        "demo",
        "build",
        "app",
        "login",
        "sign in",
        "sign up",
        "get started",
        "contact",
        "rewards",
        "retention",
        "explore",
        "preview",
        "view",
        "try",
      ];

      const lowerText = textContent.toLowerCase();
      const isCtaCandidate = ctaKeywords.some((kw) => lowerText.includes(kw));

      if (isCtaCandidate && textContent.length > 0 && textContent.length < 50) {
        // Find section context if available
        const parentSection = ctaElement.closest<HTMLElement>(
          "[data-analytics-section], section[id]"
        );
        const sectionContext = parentSection
          ? parentSection.getAttribute("data-analytics-section") || parentSection.id
          : "general";

        logCtaClick({
          ctaName: textContent,
          ctaLocation: sectionContext,
          ctaUrl: href || undefined,
          ctaType: ctaElement.tagName.toLowerCase(),
        });
      }
    };

    document.addEventListener("click", handleGlobalClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleGlobalClick, { capture: true });
    };
  }, []);

  return null;
}
