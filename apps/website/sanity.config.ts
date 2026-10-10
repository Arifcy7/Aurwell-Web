import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./src/sanity/schemaTypes";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "wk1l2a9b";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

export default defineConfig({
  basePath: "/studio",
  name: "aurwell",
  title: "Aurwell",
  projectId,
  dataset,
  plugins: [structureTool()],
  schema: {
    types: schemaTypes,
  },
});
