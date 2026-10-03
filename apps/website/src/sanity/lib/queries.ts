import { groq } from "next-sanity";

// Query all published posts ordered by published date descending
export const postsQuery = groq`
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    mainImage,
    publishedAt,
    readingTime,
    likes,
    author-> {
      _id,
      name,
      slug,
      image,
      role
    },
    categories[]-> {
      _id,
      title,
      slug
    }
  }
`;

// Query single post by slug
export const postBySlugQuery = groq`
  *[_type == "post" && (slug.current == $slug || slug.current == $decodedSlug || slug.current == $encodedSlug)][0] {
    _id,
    title,
    slug,
    excerpt,
    mainImage,
    publishedAt,
    readingTime,
    likes,
    author-> {
      _id,
      name,
      slug,
      image,
      role,
      bio
    },
    categories[]-> {
      _id,
      title,
      slug
    },
    body
  }
`;

// Query all post slugs for generateStaticParams
export const postPathsQuery = groq`
  *[_type == "post" && defined(slug.current)][].slug.current
`;

// Query all categories
export const categoriesQuery = groq`
  *[_type == "category"] | order(title asc) {
    _id,
    title,
    slug,
    description
  }
`;
