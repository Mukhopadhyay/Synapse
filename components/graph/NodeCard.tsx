"use client";

import type { GraphNode } from "@/types";
import { theme as t } from "@/lib/theme";
import { cn } from "@/lib/utils";

export type Importance = "high" | "medium" | "low";

export const NODE_DIMS: Record<Importance, { w: number; h: number }> = {
    high: { w: 190, h: 84 },
    medium: { w: 160, h: 68 },
    low: { w: 130, h: 48 },
};

const CORNER_RADIUS = 12;

export interface NodeCardProps {
    node: GraphNode;
    importance: Importance;
    isSelected: boolean;
    isHighlighted: boolean;
    isHovered: boolean;
    isDark: boolean;
}

export function NodeCard({
    node,
    importance,
    isSelected,
    isHighlighted,
    isHovered,
    isDark,
}: NodeCardProps) {
    const tags = node.tags?.slice(0, 3) ?? [];

    const active = isSelected;

    // ── Border & shadow: kept as style because they use hex+opacity accent values ──
    const accentBorder = isDark ? t.accentBright : t.accent;
    const glowColor = isDark ? `${t.accentBright}33` : `${t.accent}1a`;
    const highlightBorder = isDark ? `${t.accentBright}b3` : `${t.accent}b3`;
    const highBorder = isDark ? `${t.accentBright}40` : `${t.accent}30`;
    const defaultBorder = isDark ? "rgba(63,63,70,0.8)" : "rgba(200,200,210,0.9)";

    const borderColor = active
        ? accentBorder
        : isHighlighted
            ? highlightBorder
            : importance === "high"
                ? highBorder
                : defaultBorder;

    const borderWidth = active ? 2 : importance === "high" ? 1.8 : 1.5;

    let boxShadow: string | undefined;
    if (active) {
        boxShadow = `0 0 8px 2px ${glowColor}, 0 0 0 1px ${accentBorder}40`;
    } else if (isHighlighted) {
        boxShadow = `0 0 6px 1px ${glowColor}`;
    } else if (importance === "high") {
        boxShadow = `0 2px 4px ${glowColor}`;
    }

    // Tag accent colors (hex with opacity suffix, not expressible as static Tailwind)
    const tagBg = isDark ? `${t.accent}4d` : `${t.accent}1f`;
    const tagBorderColor = `${t.accentBright}66`;
    const tagText = isDark ? t.accentLight : t.accentDark;

    return (
        <div
            style={{
                borderRadius: CORNER_RADIUS,
                borderColor,
                borderWidth,
                boxShadow,
                fontFamily: "inherit",
            }}
            className={cn(
                "w-full h-full box-border relative flex flex-col items-center justify-center overflow-hidden",
                "border border-solid",
                "bg-white/95 dark:bg-zinc-900/[0.92]",
                "transition-[border-color,box-shadow] duration-150",
            )}
        >


            {/* Title */}
            <span
                className={cn(
                    "px-2 leading-[1.25] max-w-full [font-family:inherit]",
                    "text-zinc-800 dark:text-zinc-100",
                    importance === "high"
                        ? "text-[15px] font-bold mt-2"
                        : importance === "medium"
                            ? "text-[13px] font-semibold"
                            : "text-[11px] font-medium",
                )}
            >
                {node.title}
            </span>

            {/* Tags row */}
            {tags.length > 0 && (
                <div className="absolute bottom-1.5 flex gap-[5px]">
                    {tags.map((tag) => (
                        <span
                            key={tag}
                            style={{
                                backgroundColor: tagBg,
                                borderColor: tagBorderColor,
                                color: tagText,
                            }}
                            className="text-[8px] px-[5px] py-px rounded-[3px] border border-solid whitespace-nowrap [font-family:inherit]"
                        >
                            {tag.length > 6 ? tag.slice(0, 5) + "…" : tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
