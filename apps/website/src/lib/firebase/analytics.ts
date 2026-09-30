import { getAnalytics, isSupported, logEvent, Analytics } from "firebase/analytics";
import app from "./client";

let analyticsPromise: Promise<Analytics | null> | null = null;

/**
 * Safely initializes Firebase Analytics in a browser environment.
 * Ensures SSR safety and avoids duplicate initialization.
 */
export const getFirebaseAnalytics = (): Promise<Analytics | null> => {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => {
        if (supported) {
          const analytics = getAnalytics(app);
          return analytics;
        } else {
          console.warn("[Firebase Analytics] Analytics is not supported in this environment.");
          return null;
        }
      })
      .catch((err) => {
        console.warn("[Firebase Analytics] Initialization failed:", err);
        return null;
      });
  }

  return analyticsPromise;
};

/**
 * Generic event logger.
 */
export const logCustomEvent = async (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  try {
    const analytics = await getFirebaseAnalytics();
    if (analytics) {
      logEvent(analytics, eventName, eventParams);
      if (process.env.NODE_ENV === "development") {
        console.log(`[Firebase Analytics Event] ${eventName}`, eventParams);
      }
    }
  } catch (error) {
    console.warn(`[Firebase Analytics Error] Failed to log event ${eventName}:`, error);
  }
};

/**
 * Log page views with referrer and location details.
 */
export const logPageView = async (pagePath: string, pageTitle?: string) => {
  if (typeof window === "undefined") return;

  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get("utm_source");
  const utmMedium = urlParams.get("utm_medium");
  const utmCampaign = urlParams.get("utm_campaign");
  const utmTerm = urlParams.get("utm_term");
  const utmContent = urlParams.get("utm_content");

  const params: Record<string, any> = {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: pageTitle || document.title,
    referrer: document.referrer || "direct",
  };

  if (utmSource) params.utm_source = utmSource;
  if (utmMedium) params.utm_medium = utmMedium;
  if (utmCampaign) params.utm_campaign = utmCampaign;
  if (utmTerm) params.utm_term = utmTerm;
  if (utmContent) params.utm_content = utmContent;

  await logCustomEvent("page_view", params);
};

/**
 * Log CTA (Call to Action) button clicks.
 */
export const logCtaClick = async ({
  ctaName,
  ctaLocation,
  ctaUrl,
  ctaType = "button",
  extraParams = {},
}: {
  ctaName: string;
  ctaLocation: string;
  ctaUrl?: string;
  ctaType?: string;
  extraParams?: Record<string, any>;
}) => {
  await logCustomEvent("cta_click", {
    cta_name: ctaName,
    cta_location: ctaLocation,
    cta_url: ctaUrl || "",
    cta_type: ctaType,
    page_path: typeof window !== "undefined" ? window.location.pathname : "",
    ...extraParams,
  });
};

/**
 * Log scroll depth milestones (e.g. 25%, 50%, 75%, 90%, 100%).
 */
export const logScrollDepth = async (depthPercent: number, pagePath?: string) => {
  await logCustomEvent("scroll_depth", {
    depth_percentage: depthPercent,
    page_path: pagePath || (typeof window !== "undefined" ? window.location.pathname : ""),
  });
};

/**
 * Log section visibility (what sections users are seeing).
 */
export const logSectionView = async (sectionId: string, sectionTitle?: string) => {
  await logCustomEvent("section_view", {
    section_id: sectionId,
    section_title: sectionTitle || sectionId,
    page_path: typeof window !== "undefined" ? window.location.pathname : "",
  });
};

/**
 * Log booking modal opens or booking CTA triggers.
 */
export const logBookingTrigger = async (location: string, buttonText?: string) => {
  await logCustomEvent("booking_cta_click", {
    cta_location: location,
    button_text: buttonText || "Schedule / Book",
    page_path: typeof window !== "undefined" ? window.location.pathname : "",
  });
};

/**
 * Log interactive feature usages (e.g. app preview customization tabs, FAQ toggles).
 */
export const logFeatureInteraction = async (
  featureName: string,
  action: string,
  value?: string
) => {
  await logCustomEvent("feature_interaction", {
    feature_name: featureName,
    action: action,
    value: value || "",
    page_path: typeof window !== "undefined" ? window.location.pathname : "",
  });
};
