import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

// Allowed Google Maps hostnames for resolving short links
const ALLOWED_MAPS_HOSTS = new Set([
  "maps.google.com",
  "www.google.com",
  "google.com",
  "maps.app.goo.gl",
  "goo.gl",
]);

// Helper to validate whether a URL is safe to fetch (anti-SSRF)
function isSafeMapUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    // Enforce HTTPS
    if (parsed.protocol !== "https:") {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    // Check if host is in allowlist or is a google maps subdomain
    const isAllowedHost =
      ALLOWED_MAPS_HOSTS.has(host) ||
      host.endsWith(".google.com") ||
      host.endsWith(".goo.gl");

    if (!isAllowedHost) {
      return false;
    }

    // Reject loopback, private IPv4, link-local, cloud metadata
    if (
      host === "localhost" ||
      host.includes("metadata.google.internal") ||
      host.includes("169.254.169.254") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Helper to extract coordinates from URL string
function extractCoords(urlStr: string): { latitude: number; longitude: number } | null {
  try {
    const decodedUrl = decodeURIComponent(urlStr);

    // Pattern 1: @lat,lng (e.g. @19.0760,72.8777)
    const atRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const atMatch = decodedUrl.match(atRegex);
    if (atMatch) {
      const latitude = parseFloat(atMatch[1]);
      const longitude = parseFloat(atMatch[2]);
      if (!isNaN(latitude) && !isNaN(longitude)) {
        return { latitude, longitude };
      }
    }

    // Pattern 2: q=lat,lng or ll=lat,lng or query=lat,lng or center=lat,lng
    const qRegex = /[?&](?:q|ll|query|center)=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const qMatch = decodedUrl.match(qRegex);
    if (qMatch) {
      const latitude = parseFloat(qMatch[1]);
      const longitude = parseFloat(qMatch[2]);
      if (!isNaN(latitude) && !isNaN(longitude)) {
        return { latitude, longitude };
      }
    }
  } catch (e) {
    console.error("Error parsing URL coords:", e);
  }
  return null;
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate the user calling the API
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing authorization header" },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1]?.trim();
    try {
      await adminAuth.verifyIdToken(idToken);
    } catch (err) {
      console.error("Token verification failed:", err);
      return NextResponse.json(
        { error: "Unauthorized: Invalid authentication token" },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const bodyJson = await request.json();
    const { url } = bodyJson;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Bad Request: Missing or invalid url parameter" },
        { status: 400 }
      );
    }

    const trimmedUrl = url.trim();

    // 3. Validate against SSRF (must be a valid, trusted Google Maps URL)
    if (!isSafeMapUrl(trimmedUrl)) {
      return NextResponse.json(
        {
          error:
            "Invalid URL: Only valid, secure Google Maps links (e.g. maps.google.com or maps.app.goo.gl) are allowed.",
        },
        { status: 400 }
      );
    }

    // 4. Resolve redirects to find coordinates
    let currentUrl = trimmedUrl;
    let coords = extractCoords(currentUrl);

    if (!coords) {
      // Loop to follow redirects (up to 5 redirects)
      for (let i = 0; i < 5; i++) {
        try {
          if (!isSafeMapUrl(currentUrl)) {
            break;
          }

          const res = await fetch(currentUrl, {
            method: "GET",
            redirect: "manual",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          });

          // Check Location header for redirect
          const location = res.headers.get("location");
          if (!location) {
            // Check if final URL contains coordinates
            coords = extractCoords(res.url);
            break;
          }

          // Resolve relative redirect if any
          const nextUrl = new URL(location, currentUrl).toString();

          // Validate redirect target URL against SSRF
          if (!isSafeMapUrl(nextUrl)) {
            break;
          }

          coords = extractCoords(nextUrl);
          if (coords) {
            break;
          }
          currentUrl = nextUrl;
        } catch (fetchErr) {
          console.error(`Error resolving redirect at step ${i}:`, fetchErr);
          break;
        }
      }
    }

    if (coords) {
      return NextResponse.json({
        success: true,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    }

    return NextResponse.json({
      success: false,
      error: "Could not extract coordinates from the provided Google Maps link",
    });
  } catch (err: any) {
    console.error("Error in resolve-map-link API:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
