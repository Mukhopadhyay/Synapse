"use client";

import { useSynapseStore } from "@/store";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ListView() {
    const { nodes, selectedNode, setSelectedNode } = useSynapseStore();

    return (
        <ScrollArea className="flex-1 h-full">
            <div className="p-6">
                <div className="max-w-3xl mx-auto space-y-2">
                    {nodes.map((node, i) => (
                        <motion.button
                            key={node.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                            className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${selectedNode?.id === node.id
                                ? "bg-accent-theme/15 border-accent-theme/40 text-accent-theme-dark dark:text-accent-theme-light"
                                : "bg-white dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:border-gray-300 dark:hover:border-white/[0.1]"
                                }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{node.title}</p>
                                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                                        {node.description}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-1 shrink-0">
                                    {node.tags?.slice(0, 2).map((t) => (
                                        <span
                                            key={t}
                                            className="px-1.5 py-0 text-[10px] rounded bg-accent-theme/20 text-accent-theme dark:text-accent-theme-light border border-accent-theme/30"
                                        >
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-500 dark:text-zinc-600">
                                <span>{node.metadata?.type ?? "—"}</span>
                                <span>·</span>
                                <span>{node.connections?.length ?? 0} connections</span>
                                {node.difficulty && (
                                    <>
                                        <span>·</span>
                                        <span>Difficulty {node.difficulty}</span>
                                    </>
                                )}
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>
        </ScrollArea>
    );
}
