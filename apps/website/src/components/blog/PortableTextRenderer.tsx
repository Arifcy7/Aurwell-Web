"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { PortableText, PortableTextComponents } from "@portabletext/react";
import { urlForImage } from "@/sanity/lib/image";

export const portableTextComponents: PortableTextComponents = {
  types: {
    image: ({ value }: any) => {
      const imageUrl = urlForImage(value);
      if (!imageUrl) return null;
      return (
        <figure className="my-10 -mx-3 sm:mx-0">
          <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-[#eaf0eb]/60 border border-[#e2eae3]">
            <Image
              src={imageUrl}
              alt={value.alt || "Article illustration"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 720px"
            />
          </div>
          {value.caption && (
            <figcaption className="mt-3 text-center text-xs sm:text-sm text-[#5d6d60] font-sans italic">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },
    callout: ({ value }: any) => {
      return (
        <div className="my-9 p-6 sm:p-7 rounded-2xl bg-[#edf4ed] border border-[#d6e3d7] text-[#1c291f]">
          {value.title && (
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#2f663c]" />
              <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#2f663c]">
                {value.title}
              </h4>
            </div>
          )}
          <p className="font-sans text-[15px] sm:text-base leading-relaxed text-[#2a382d]">
            {value.text}
          </p>
        </div>
      );
    },
  },
  block: {
    normal: ({ children }) => (
      <p className="font-serif text-[18px] sm:text-[20px] leading-[1.82] text-[#222a23] mb-6 tracking-[-0.003em]">
        {children}
      </p>
    ),
    h2: ({ children }) => (
      <h2 className="font-sans text-2xl sm:text-3xl font-extrabold text-[#152017] tracking-tight mt-12 mb-4">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="font-sans text-xl sm:text-2xl font-bold text-[#1a251c] tracking-tight mt-9 mb-3">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="font-sans text-lg sm:text-xl font-bold text-[#1f2b21] tracking-tight mt-7 mb-2">
        {children}
      </h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-8 pl-5 sm:pl-6 border-l-[3px] border-[#2e623b] italic font-serif text-[21px] sm:text-[23px] leading-[1.65] text-[#273529]">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="my-6 space-y-2.5 list-disc pl-6 marker:text-[#2e623b] font-serif text-[18px] sm:text-[19px] leading-[1.75] text-[#242d25]">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="my-6 space-y-2.5 list-decimal pl-6 marker:text-[#2e623b] font-serif text-[18px] sm:text-[19px] leading-[1.75] text-[#242d25]">
        {children}
      </ol>
    ),
  },
  marks: {
    strong: ({ children }) => (
      <strong className="font-semibold text-[#141c15]">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    code: ({ children }) => (
      <code className="px-1.5 py-0.5 rounded-md bg-[#e7efe8] text-[#213526] font-mono text-[0.88em]">
        {children}
      </code>
    ),
    link: ({ value, children }) => {
      const target = (value?.href || "").startsWith("http") ? "_blank" : undefined;
      return (
        <a
          href={value?.href}
          target={target}
          rel={target === "_blank" ? "noindex nofollow" : undefined}
          className="text-[#255530] underline underline-offset-[3px] decoration-[#85a88c] hover:decoration-[#255530] transition-colors"
        >
          {children}
        </a>
      );
    },
  },
};

export default function PortableTextRenderer({ value }: { value: any }) {
  if (!value) return null;
  return <PortableText value={value} components={portableTextComponents} />;
}
