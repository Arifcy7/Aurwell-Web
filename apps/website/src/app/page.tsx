import { getAllPosts } from "@/sanity/lib/sanityFetch";
import HomeClient from "./HomeClient";

export const revalidate = 60;

export default async function HomePage() {
  const posts = await getAllPosts();
  return <HomeClient initialPosts={posts} />;
}
