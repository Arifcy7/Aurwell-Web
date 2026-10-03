import { defineType, defineField } from "sanity";

export const postType = defineType({
  name: "post",
  title: "Blog Post",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required().error("A title is required"),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (rule) => rule.required().error("A slug is required to generate the article URL"),
    }),
    defineField({
      name: "excerpt",
      title: "Subtitle / Excerpt",
      type: "text",
      rows: 3,
      description: "A succinct summary of the article displayed on feeds and social cards.",
      validation: (rule) => rule.max(300).warning("Keep excerpts under 300 characters for optimal display"),
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      to: { type: "author" },
    }),
    defineField({
      name: "mainImage",
      title: "Main / Header Image",
      type: "image",
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: "alt",
          type: "string",
          title: "Alternative Text",
        },
        {
          name: "caption",
          type: "string",
          title: "Image Caption",
        },
      ],
    }),
    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      of: [{ type: "reference", to: { type: "category" } }],
    }),
    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "readingTime",
      title: "Estimated Reading Time (minutes)",
      type: "number",
      description: "e.g., 4 (minutes). If left blank, it will be automatically calculated.",
    }),
    defineField({
      name: "likes",
      title: "Like Count",
      type: "number",
      description: "Set or adjust the starting like count for this article.",
      initialValue: 24,
    }),
    defineField({
      name: "body",
      title: "Body Content",
      type: "blockContent",
    }),
  ],
  preview: {
    select: {
      title: "title",
      author: "author.name",
      media: "mainImage",
      date: "publishedAt",
    },
    prepare(selection) {
      const { author, date } = selection;
      return {
        ...selection,
        subtitle: author && date ? `by ${author} • ${new Date(date).toLocaleDateString()}` : author || date,
      };
    },
  },
});
