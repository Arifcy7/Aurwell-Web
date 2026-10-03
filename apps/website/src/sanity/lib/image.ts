import { createClient } from "next-sanity";
import { createImageUrlBuilder } from "@sanity/image-url";
import { projectId, dataset } from "./client";

const imageBuilder = projectId
  ? createImageUrlBuilder({
      projectId: projectId || "",
      dataset: dataset || "production",
    })
  : null;

export const urlForImage = (source: any) => {
  if (!source) return null;
  // If it's already a full URL (such as in mock data or external image)
  if (typeof source === "string") return source;
  if (source.asset?.url) return source.asset.url;
  if (source.url) return source.url;

  if (imageBuilder) {
    return imageBuilder.image(source).auto("format").fit("max").url();
  }
  return null;
};
