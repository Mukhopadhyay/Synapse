"use client";

import { Plus, Link2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface FloatingActionBarProps {
    onCreate?: () => void;
    onConnect?: () => void;
    onAnalyze?: () => void;
}

const ACTIONS = [
    { key: "create", label: "Create", Icon: Plus },
    { key: "connect", label: "Connect", Icon: Link2 },
    { key: "analyze", label: "Analyze", Icon: Sparkles },
] as const;

export function FloatingActionBar({
    onCreate,
    onConnect,
    onAnalyze,
}: FloatingActionBarProps) {
    const handlers = { create: onCreate, connect: onConnect, analyze: onAnalyze };

    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 25 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30"
        >
            <div className="flex items-center gap-1 px-2 py-2 rounded-2xl bg-[#18181b]/95 border border-white/[0.08] backdrop-blur-md shadow-2xl shadow-black/40">
                {ACTIONS.map(({ key, label, Icon }) => (
                    <motion.button
                        key={key}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handlers[key]}
                        className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl hover:bg-white/[0.06] transition-colors group"
                    >
                        <div className="size-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center group-hover:bg-accent-theme/20 group-hover:border-accent-theme/40 transition-colors">
                            <Icon className="size-4 text-zinc-400 group-hover:text-accent-theme-light transition-colors" />
                        </div>
                        <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
                            {label}
                        </span>
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
}
