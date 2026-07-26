import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

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
      return NextResponse.json({ error: "Unauthorized: Missing authorization header" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
      await adminAuth.verifyIdToken(idToken);
    } catch (err) {
      console.error("Token verification failed:", err);
      return NextResponse.json({ error: "Unauthorized: Invalid authentication token" }, { status: 401 });
    }

    // 2. Parse request body
    const bodyJson = await request.json();
    const { url } = bodyJson;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Bad Request: Missing or invalid url parameter" }, { status: 400 });
    }

    // 3. Resolve redirects to find coordinates
    let currentUrl = url;
    let coords = extractCoords(currentUrl);

    if (!coords) {
      // Loop to follow redirects (up to 5 redirects)
      for (let i = 0; i < 5; i++) {
        try {
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
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
