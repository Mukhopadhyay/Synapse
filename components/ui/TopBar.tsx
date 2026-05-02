"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSynapseStore } from "@/store";
import { useRouter } from "next/navigation";


interface TopBarProps {
    activeTab: "graph" | "list";
    onTabChange: (tab: "graph" | "list") => void;
}

export function TopBar({ activeTab, onTabChange }: TopBarProps) {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const { nodes, setSelectedNode } = useSynapseStore();
    const handleRandomNode = () => {
        if (nodes.length === 0) return;
        const idx = Math.floor(Math.random() * nodes.length);
        setSelectedNode(nodes[idx]);
    };

    return (
        <header className="flex items-center justify-between h-12 px-4 border-b border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#0e0e10] shrink-0 z-40">
            {/* Logo */}
            <div className="flex items-center gap-2" onClick={() => {
                router.push('/');
            }}>
                <div className="size-6 rounded bg-gradient-to-br from-accent-theme to-accent-theme-dark flex items-center justify-center">
                    <span className="text-[11px] font-bold text-white">S</span>
                </div>
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 tracking-tight">
                    Synapse
                </span>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/[0.04] rounded-lg p-1">
                <TabButton
                    label="Graph"
                    active={activeTab === "graph"}
                    onClick={() => onTabChange("graph")}
                />
                <TabButton
                    label="List"
                    active={activeTab === "list"}
                    onClick={() => onTabChange("list")}
                />
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
                <Button
                    onClick={handleRandomNode}
                    size="sm"
                    className="h-7 text-xs bg-accent-theme/20 text-accent-theme dark:text-accent-theme-light border border-accent-theme/40 hover:bg-accent-theme/30 rounded-lg gap-1.5"
                    variant="ghost"
                >
                    <Shuffle className="size-3" />
                    Random Node
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="size-7 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                    {(theme ?? "light") === "dark" ? (
                        <Sun className="size-3.5" />
                    ) : (
                        <Moon className="size-3.5" />
                    )}
                </Button>
            </div>
        </header>
    );
}

function TabButton({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`relative px-3 py-1 text-xs rounded-md transition-colors ${active
                ? "text-zinc-800 dark:text-zinc-100 bg-gray-200 dark:bg-white/[0.07]"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
        >
            {label}
            {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-accent-theme-bright" />
            )}
        </button>
    );
}
