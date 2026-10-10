import { defineType, defineField } from "sanity";

export const authorType = defineType({
  name: "author",
  title: "Author",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "name",
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "image",
      title: "Avatar Image",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "role",
      title: "Role or Title",
      type: "string",
      description: "e.g., Clinical Director, Aesthetic Physician, HealthTech Researcher",
    }),
    defineField({
      name: "bio",
      title: "Bio",
      type: "text",
      rows: 3,
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "role",
      media: "image",
    },
  },
});
