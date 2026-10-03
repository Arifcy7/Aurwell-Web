import { NextResponse } from "next/server";
import { getAllPosts } from "@/sanity/lib/sanityFetch";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const posts = await getAllPosts();
    return NextResponse.json(posts);
  } catch (error) {
    console.error("Failed to fetch posts via API route:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
