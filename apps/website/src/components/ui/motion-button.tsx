"use client";

import React, { FC } from "react";
import { ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Link from "next/link";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  label: string;
  href?: string;
  variant?: "primary" | "secondary";
  classes?: string;
  className?: string;
  animate?: boolean;
  delay?: number;
  onClick?: () => void;
}

const MotionButton: FC<Props> = ({ label, href, classes, className, onClick }) => {
  const content = (
    <div
      onClick={onClick}
      className={cn(
        "group relative inline-flex items-center justify-start h-11 pl-1 pr-5 cursor-pointer rounded-full bg-[#F3F4F6] outline-none overflow-hidden transition-all duration-300 select-none border-0 shadow-none",
        classes,
        className
      )}
    >
      <span
        className="circle absolute left-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-neutral-900 transition-all duration-500 ease-out group-hover:left-0 group-hover:w-full group-hover:h-full"
        aria-hidden="true"
      />
      <div className="icon relative z-10 flex h-9 w-9 items-center justify-center transition-transform duration-500 ease-out group-hover:translate-x-1">
        <ArrowRight className="h-4.5 w-4.5 text-white" />
      </div>
      <span className="button-text relative z-10 pl-3.5 pr-1 text-xs sm:text-sm font-semibold tracking-tight whitespace-nowrap text-neutral-900 transition-colors duration-500 group-hover:text-white">
        {label}
      </span>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
};

export default MotionButton;
