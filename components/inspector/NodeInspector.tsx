"use client";

import { useEffect, useRef } from "react";
import { X, Pin, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSynapseStore } from "@/store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export function NodeInspector() {
    const {
        selectedNode, setSelectedNode, togglePinNode,
        pinnedNodes, isInspectorFullscreen, setInspectorFullscreen,
    } = useSynapseStore();

    const panelRef = useRef<HTMLElement>(null);
    const isPinned = selectedNode ? pinnedNodes.includes(selectedNode.id) : false;

    // Dismiss the inspector when clicking outside the panel.
    // Clicks originating from a node card (.node-group) are excluded so that
    // selecting a different node switches the inspector rather than flickering.
    useEffect(() => {
        if (!selectedNode) return;

        function handleMouseDown(e: MouseEvent) {
            const target = e.target as Element | null;
            if (!target) return;
            if (target.closest?.(".node-group")) return;
            if (panelRef.current?.contains(target)) return;
            setSelectedNode(null);
        }

        document.addEventListener("mousedown", handleMouseDown);
        return () => document.removeEventListener("mousedown", handleMouseDown);
    }, [selectedNode, setSelectedNode]);

    const panelWidth = "min(45vw, 480px)";

    return (
        <AnimatePresence>
            {selectedNode && (
                <motion.aside key="inspector" ref={panelRef}
                    initial={{ x: "100%", opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "100%", opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    style={{ width: panelWidth }}
                    className="bg-white dark:bg-[#111113] border-l border-gray-200 dark:border-white/[0.07] flex flex-col overflow-hidden absolute right-0 top-0 h-full z-30 hidden md:flex">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/[0.07] shrink-0">
                        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">Node Inspector</span>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setInspectorFullscreen(!isInspectorFullscreen)}
                                className="size-6 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
                                title={isInspectorFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                                {isInspectorFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => togglePinNode(selectedNode.id)}
                                className={`size-6 ${isPinned ? "text-accent-theme-light" : "text-zinc-500"}`}
                                title={isPinned ? "Unpin" : "Pin"}>
                                <Pin className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)}
                                className="size-6 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"><X className="size-3.5" /></Button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 min-h-0">
                        <NodeInspectorContent />
                    </ScrollArea>
                </motion.aside>
            )}
        </AnimatePresence>
    );
}

/**
 * Shared content displayed in both the side panel (NodeInspector) and the
 * modal dialog (NodeDialog). Extracts the selected node from the store.
 */
export function NodeInspectorContent() {
    const { selectedNode, setSelectedNode, nodes } = useSynapseStore();

    if (!selectedNode) return null;

    const linkedNodes = (selectedNode.connections ?? [])
        .map((id) => nodes.find((n) => n.id === id))
        .filter(Boolean);

    const tags = selectedNode.tags ?? [];

    return (
        <>
            <div className="w-full h-[140px] bg-gradient-to-br from-accent-theme-dark/40 via-accent-theme/30 to-zinc-900/80 flex items-center justify-center border-b border-gray-200 dark:border-white/[0.07] shrink-0">
                <div className="size-16 rounded-2xl bg-gradient-to-br from-accent-theme/30 to-accent-theme-dark/20 border border-accent-theme-bright/30 flex items-center justify-center">
                    <span className="text-2xl">🧠</span>
                </div>
            </div>

            <div className="p-4 space-y-4">
                <div>
                    <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100 leading-snug">{selectedNode.title}</h2>
                    <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{selectedNode.description}</p>
                </div>

                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                            <Badge key={tag} className="px-2 py-0.5 text-[10px] bg-accent-theme/20 text-accent-theme-light border border-accent-theme/30 rounded-full">{tag}</Badge>
                        ))}
                    </div>
                )}

                <Separator className="bg-gray-200 dark:bg-white/[0.06]" />

                {selectedNode.content && (
                    <>
                        <div>
                            <h3 className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-600 mb-3">Content</h3>
                            <MarkdownContent content={selectedNode.content} />
                        </div>
                    </>
                )}

                <Separator className="bg-gray-200 dark:bg-white/[0.06]" />

                <div>
                    <h3 className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-600 mb-2">Attributes</h3>
                    <div className="space-y-2">
                        <AttributeRow label="Type" value={selectedNode.metadata?.type ?? "—"} />
                        <AttributeRow label="Last Modified" value={formatDate(selectedNode.updatedAt)} />
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500">Difficulty</span>
                            <DifficultyBars level={typeof selectedNode.difficulty === "number" ? selectedNode.difficulty : 0} />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500">Complexity</span>
                            <DifficultyBars level={selectedNode.metadata?.complexity ?? 0} />
                        </div>
                        {typeof selectedNode.direction === "object" && selectedNode.direction?.type && (
                            <AttributeRow label="Direction" value={selectedNode.direction.type} />
                        )}
                    </div>
                </div>

                {selectedNode.contributors && selectedNode.contributors.length > 0 && (
                    <>
                        <Separator className="bg-gray-200 dark:bg-white/[0.06]" />
                        <div>
                            <h3 className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-600 mb-2">Contributors</h3>
                            <div className="space-y-1">
                                {selectedNode.contributors.map((c) => (
                                    <div key={c.github} className="flex items-center gap-2">
                                        <span className="text-xs text-zinc-700 dark:text-zinc-300">{c.name}</span>
                                        <span className="text-[10px] text-zinc-400 dark:text-zinc-600">@{c.github}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {linkedNodes.length > 0 && (
                    <>
                        <Separator className="bg-gray-200 dark:bg-white/[0.06]" />
                        <div>
                            <h3 className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-600 mb-2">Linked Entities</h3>
                            <div className="space-y-1.5">
                                {linkedNodes.map((n) => {
                                    if (!n) return null;
                                    const isCode = n.metadata?.type?.includes("component") || n.metadata?.type?.includes("architecture");
                                    return (
                                        <motion.button key={n.id} whileHover={{ x: 2 }} onClick={() => setSelectedNode(n)}
                                            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] hover:border-accent-theme/30 hover:bg-accent-theme/10 transition-colors text-left group">
                                            <span className="text-sm">{isCode ? "⌥" : "📖"}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-accent-theme dark:group-hover:text-accent-theme-light truncate">{n.title}</p>
                                                <p className="text-[10px] text-zinc-400 dark:text-zinc-600">{n.metadata?.type?.split(".")[1] ?? "entity"}</p>
                                            </div>
                                            <ExternalLink className="size-3 text-zinc-400 dark:text-zinc-600 group-hover:text-accent-theme dark:group-hover:text-accent-theme-light shrink-0" />
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

function AttributeRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">{label}</span>
            <span className="text-xs text-zinc-600 dark:text-zinc-300 font-mono">{value}</span>
        </div>
    );
}

function DifficultyBars({ level }: { level: number }) {
    return (
        <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
                <span key={i}
                    className={`h-1.5 w-4 rounded-full transition-colors ${i < level ? "bg-accent-theme-bright" : "bg-gray-200 dark:bg-zinc-700"}`} />
            ))}
        </div>
    );
}

function formatDate(dateStr?: string): string {
    if (!dateStr) return "—";
    try {
        return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return dateStr; }
}

// ── Simple Markdown renderer ──────────────────────────────────────────────────
function parseInline(text: string): React.ReactNode[] {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/);
    return parts
        .filter((p): p is string => Boolean(p))
        .map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={i} className="font-semibold text-zinc-700 dark:text-zinc-200">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
                return (
                    <code key={i} className="px-1 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-zinc-800 text-accent-theme dark:text-accent-theme-light font-mono">
                        {part.slice(1, -1)}
                    </code>
                );
            }
            const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
                return (
                    <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer"
                        className="text-accent-theme dark:text-accent-theme-light underline underline-offset-2 hover:opacity-80">
                        {linkMatch[1]}
                    </a>
                );
            }
            return <span key={i}>{part}</span>;
        });
}

function MarkdownContent({ content }: { content: string }) {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLines: string[] = [];
    let listBuffer: string[] = [];

    const flushList = (key: string) => {
        if (listBuffer.length === 0) return;
        elements.push(
            <ul key={key} className="ml-3 space-y-0.5 my-1.5 list-none">
                {listBuffer.map((item, j) => (
                    <li key={j} className="flex gap-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        <span className="mt-1.5 size-1 rounded-full bg-accent-theme-light shrink-0" />
                        <span>{parseInline(item)}</span>
                    </li>
                ))}
            </ul>
        );
        listBuffer = [];
    };

    lines.forEach((line, idx) => {
        const key = `line-${idx}`;

        if (line.startsWith("```")) {
            if (!inCodeBlock) { flushList(`list-before-${idx}`); inCodeBlock = true; codeLines = []; }
            else {
                elements.push(
                    <pre key={key} className="rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.06] p-3 overflow-x-auto my-2">
                        <code className="text-[11px] text-zinc-700 dark:text-zinc-300 font-mono leading-relaxed">{codeLines.join("\n")}</code>
                    </pre>
                );
                inCodeBlock = false; codeLines = [];
            }
            return;
        }

        if (inCodeBlock) { codeLines.push(line); return; }

        const isListItem = line.startsWith("- ") || line.startsWith("* ") || /^\d+\. /.test(line);
        if (isListItem) {
            const text = line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "");
            listBuffer.push(text); return;
        } else { flushList(`list-${idx}`); }

        if (/^#{1,6} /.test(line)) {
            const level = line.match(/^#+/)![0].length;
            const text = line.replace(/^#+\s+/, "");
            const sizeClass = level === 1 ? "text-sm font-bold mt-4 mb-1.5 text-zinc-800 dark:text-zinc-100"
                : level === 2 ? "text-xs font-semibold mt-3 mb-1 text-zinc-700 dark:text-zinc-200"
                    : "text-xs font-medium mt-2 mb-0.5 text-zinc-600 dark:text-zinc-300";
            elements.push(<p key={key} className={sizeClass}>{parseInline(text)}</p>);
        } else if (line.trim() === "" || line.match(/^[-*_]{3,}$/)) {
            // skip blank lines and horizontal rules
        } else if (line.trim()) {
            elements.push(<p key={key} className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed my-0.5">{parseInline(line)}</p>);
        }
    });

    flushList("list-final");
    return <div className="space-y-0.5">{elements}</div>;
}
