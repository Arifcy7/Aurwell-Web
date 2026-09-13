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
    const pathStr = Array.isArray(path) ? path.join("/") : path;
    const url = new URL(req.url);
    const targetUrl = `${getTargetUrl()}/api/booking/${pathStr}${url.search}`;

    const headers: Record<string, string> = {
      "Content-Type": req.headers.get("content-type") || "application/json",
    };

    // Verify incoming Firebase Auth token from Admin Panel
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1]?.trim();
      try {
        await adminAuth.verifyIdToken(token);
      } catch (authErr: any) {
        console.warn("Admin proxy auth token warning:", authErr.message);
      }
    }

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
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
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
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }
  );
}
