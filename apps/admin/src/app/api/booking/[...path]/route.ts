import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

function getTargetUrl(): string {
  let url =
    process.env.BOOKING_API_URL ||
    process.env.NEXT_PUBLIC_BOOKING_API_URL ||
    "https://bookingapi-guexeyftta-nw.a.run.app";

  if (url.startsWith("https://localhost:") || url.startsWith("https://127.0.0.1:")) {
    url = url.replace("https://", "http://");
  }
  return url.replace(/\/$/, "");
}

async function proxyRequest(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    
    // Sanitize path segments to prevent directory traversal
    const safeSegments = (Array.isArray(path) ? path : [path])
      .map((seg) => String(seg).replace(/[^a-zA-Z0-9_-]/g, ""))
      .filter(Boolean);

    if (safeSegments.length === 0) {
      return NextResponse.json({ error: "Invalid booking API endpoint" }, { status: 400 });
    }

    const pathStr = safeSegments.join("/");
    const url = new URL(req.url);
    const targetUrl = `${getTargetUrl()}/api/booking/${pathStr}${url.search}`;

    // Verify incoming Firebase Auth token from Admin Panel
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing or malformed authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1]?.trim();
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: Missing bearer token" },
        { status: 401 }
      );
    }

    try {
      await adminAuth.verifyIdToken(token);
    } catch (authErr: any) {
      console.warn("Admin proxy auth token error:", authErr.message);
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired session token" },
        { status: 401 }
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": req.headers.get("content-type") || "application/json",
      Authorization: `Bearer ${token}`,
    };

    const init: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      const bodyText = await req.text();
      if (bodyText) {
        init.body = bodyText;
      }
    }

    const backendRes = await fetch(targetUrl, init);
    const contentType = backendRes.headers.get("content-type") || "";
    let data;
    if (contentType.includes("application/json")) {
      data = await backendRes.json();
    } else {
      const text = await backendRes.text();
      data = { message: text };
    }

    return NextResponse.json(data, {
      status: backendRes.status,
    });
  } catch (error: any) {
    console.error("Booking API proxy error:", error);
    return NextResponse.json(
      { error: error.message || "Proxy to booking backend failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, ctx: any) {
  return proxyRequest(req, ctx);
}

export async function POST(req: NextRequest, ctx: any) {
  return proxyRequest(req, ctx);
}

export async function PUT(req: NextRequest, ctx: any) {
  return proxyRequest(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: any) {
  return proxyRequest(req, ctx);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
