"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GitBranch, ArrowRight } from "lucide-react";
import { theme as t } from "@/lib/theme";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay },
  }),
};

export default function Home() {
  const router = useRouter();

  return (
    <main className="relative h-screen overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Radial red glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            `radial-gradient(ellipse 70% 55% at 50% 50%, ${t.accent}1a, transparent 70%)`,
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-xl mx-auto gap-7">
        {/* Logo badge */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl select-none shadow-xl"
            style={{
              background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentBright} 100%)`,
              boxShadow: `0 8px 32px ${t.accent}59`,
            }}
          >
            S
          </div>
        </motion.div>

        {/* Title + subtitle */}
        <motion.div
          custom={0.1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
            Synapse
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-snug">
            A graph-based knowledge system for exploring technical concepts
          </p>
        </motion.div>

        {/* Description */}
        <motion.p
          custom={0.2}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="text-muted-foreground max-w-md leading-relaxed text-sm sm:text-base"
        >
          Navigate a living map of ideas — MDX-powered nodes connected by
          meaningful relationships, visualised as an interactive graph you can
          explore and inspect.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          custom={0.3}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
        >
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2 px-8 text-white border-0 cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentBright} 100%)`,
                boxShadow: `0 0 24px ${t.accent}66`,
              }}
              onClick={() => router.push("/graph")}
            >
              Load Graph
              <ArrowRight className="size-4" />
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto gap-2 px-8 cursor-pointer"
              onClick={() =>
                window.open(
                  "https://github.com/Mukhopadhyay/synapse",
                  "_blank",
                  "noopener,noreferrer"
                )
              }
            >
              <GitBranch className="size-4" />
              View on GitHub
            </Button>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.p
          custom={0.45}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="text-xs text-muted-foreground/50 mt-2"
        >
          Built with Next.js · D3 · MDX
        </motion.p>
      </div>
    </main>
  );
}
