"use client";

import React from "react";
import { motion, HTMLMotionProps, Variants } from "framer-motion";

export const bentoContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.02,
    },
  },
};

export const bentoItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 18,
    scale: 0.985,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.42,
      ease: [0.16, 1, 0.3, 1], // Snappy high-end cubic bezier (Apple / Linear style)
    },
  },
};

interface MotionContainerProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  delay?: number;
}

export function MotionContainer({
  children,
  className = "",
  staggerDelay = 0.08,
  delay = 0.02,
  ...props
}: MotionContainerProps) {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface MotionCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  hoverLift?: boolean;
}

export function MotionCard({
  children,
  className = "",
  hoverLift = true,
  ...props
}: MotionCardProps) {
  return (
    <motion.div
      variants={bentoItemVariants}
      whileHover={
        hoverLift
          ? {
              y: -2.5,
              transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
            }
          : undefined
      }
      style={{ willChange: "transform, opacity" }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
