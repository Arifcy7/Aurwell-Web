# Sanity CMS Integration Guide for Aurwell

This document provides a comprehensive guide on how to configure, populate, and deploy **Sanity CMS** for the Aurwell landing page blog.

---

## 1. Quick Overview

The blog in `apps/website` is powered by:
- **Sanity v3 / v6 Studio**: Embedded directly inside Next.js at [`/studio`](http://localhost:3000/studio).
- **Next-Sanity**: Official Next.js client for data fetching, caching, and revalidation.
- **PortableText**: Custom-styled rich-text renderer matching the minimalist, light-green tinted Medium aesthetic.
- **Graceful Fallback**: If Sanity credentials are not yet configured, the app seamlessly serves curated mock posts so local development and design reviews never break.

---

## 2. Step-by-Step Sanity Project Setup

### Step 2.1: Create a Project on Sanity.io
1. Go to [https://www.sanity.io/manage](https://www.sanity.io/manage) and log in or create an account.
2. Click **"Create new project"** (or use the Sanity CLI: `npx sanity init`).
3. Enter a project name, e.g., `Aurwell Website`.
4. Choose the default dataset name: `production`.
5. Note down your **Project ID** (a 8–10 character alphanumeric string like `a1b2c3d4`).

### Step 2.2: Configure CORS Origins (Required for Embedded Studio)
In order for your embedded studio at `http://localhost:3000/studio` (and later your production domain) to communicate with Sanity:
1. Open your project on [sanity.io/manage](https://www.sanity.io/manage).
2. Go to **API** > **CORS Origins**.
3. Click **"Add CORS origin"**.
4. Add the following origins:
   - For local development: `http://localhost:3000`
   - Check **"Allow credentials"** (essential for studio login cookies).
   - Click **Save**.
5. When deploying to production (e.g. Vercel), repeat this step and add your live domain (e.g., `https://aurwell.app` or `https://*.vercel.app`).

---

## 3. Configuring Environment Variables

Create or update the `.env.local` file inside `apps/website/`:

```bash
# apps/website/.env.local

NEXT_PUBLIC_SANITY_PROJECT_ID="your_actual_project_id"
NEXT_PUBLIC_SANITY_DATASET="production"
NEXT_PUBLIC_SANITY_API_VERSION="2024-03-01"
```

> **Note**: For production deployments (Vercel, AWS, etc.), make sure to add these exact same environment variables in your hosting provider's dashboard under **Project Settings > Environment Variables**.

---

## 4. Using the Embedded Sanity Studio

Once your dev server is running (`npm run dev`):

1. Open your browser and navigate to:
   ```
   http://localhost:3000/studio
   ```
2. You will be prompted to log in with your Sanity credentials.
3. Once authenticated, you will see the **Aurwell Content Studio** with three primary content types:
   - **Authors**: Create authors (Name, avatar, medical/editorial role, bio).
   - **Categories**: Create topics (e.g., *Clinical Excellence*, *Patient Experience*, *Wellness Tech*, *Clinic Growth*).
   - **Blog Posts**: Write rich stories with titles, slugs, excerpts, featured images, and body content.

---

## 5. Schema Reference

All schema definitions live in `apps/website/src/sanity/schemaTypes/`:

| Document | File | Key Fields |
|---|---|---|
| **Blog Post** | `postType.ts` | `title`, `slug`, `excerpt`, `author` (ref), `categories` (refs), `mainImage`, `publishedAt`, `readingTime`, `body` |
| **Author** | `authorType.ts` | `name`, `slug`, `image`, `role`, `bio` |
| **Category** | `categoryType.ts` | `title`, `slug`, `description` |
| **Block Content** | `blockContentType.ts` | Normal text, H2, H3, Blockquotes (with green bar), Images with captions, Key Takeaway Callout cards |

### Recommended Publishing Workflow:
1. **First**, create at least one **Author** and one **Category** in the Studio.
2. **Next**, create a **Blog Post**:
   - Enter the **Title** and click **Generate** next to Slug.
   - Add a 1–2 sentence **Excerpt** (used for cards and SEO meta tags).
   - Select the **Author** and **Category**.
   - Upload a **Main Image** and add descriptive Alt Text.
   - Enter your **Body Content** (use Headings, Quotes, and Callout blocks).
   - Click the green **"Publish"** button at the bottom right.
3. Visit [`http://localhost:3000/blog`](http://localhost:3000/blog) to see your published article live!

---

## 6. Code Architecture Reference

- **Studio Config**: [`apps/website/sanity.config.ts`](file:///c:/Users/ayazk/Projects/Aurwell-Web/apps/website/sanity.config.ts)
- **Sanity Client**: [`apps/website/src/sanity/lib/client.ts`](file:///c:/Users/ayazk/Projects/Aurwell-Web/apps/website/src/sanity/lib/client.ts)
- **GROQ Queries**: [`apps/website/src/sanity/lib/queries.ts`](file:///c:/Users/ayazk/Projects/Aurwell-Web/apps/website/src/sanity/lib/queries.ts)
- **Image URL Builder**: [`apps/website/src/sanity/lib/image.ts`](file:///c:/Users/ayazk/Projects/Aurwell-Web/apps/website/src/sanity/lib/image.ts)
- **Data Fetcher with Fallback**: [`apps/website/src/sanity/lib/sanityFetch.ts`](file:///c:/Users/ayazk/Projects/Aurwell-Web/apps/website/src/sanity/lib/sanityFetch.ts)
- **PortableText Renderer**: [`apps/website/src/components/blog/PortableTextRenderer.tsx`](file:///c:/Users/ayazk/Projects/Aurwell-Web/apps/website/src/components/blog/PortableTextRenderer.tsx)
- **Medium UI Layout**: [`apps/website/src/app/blog/layout.tsx`](file:///c:/Users/ayazk/Projects/Aurwell-Web/apps/website/src/app/blog/layout.tsx)

---

## 7. Next.js Image Optimization for Sanity

The Next.js configuration in [`apps/website/next.config.ts`](file:///c:/Users/ayazk/Projects/Aurwell-Web/apps/website/next.config.ts) is already configured to allow Sanity CDN image domains:

```ts
images: {
  formats: ["image/avif", "image/webp"],
  remotePatterns: [
    {
      protocol: "https",
      hostname: "cdn.sanity.io",
    },
    {
      protocol: "https",
      hostname: "images.unsplash.com",
    },
  ],
},
```
