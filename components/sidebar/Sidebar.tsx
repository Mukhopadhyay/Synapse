"use client";

import { useState } from "react";
import {
    Search, Network, Tag, SlidersHorizontal, Pin,
    ChevronLeft, ChevronRight, X,
} from "lucide-react";
import Fuse from "fuse.js";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSynapseStore } from "@/store";
import type { GraphNode } from "@/types";

type SectionKey = "Nodes" | "Tags" | "Filters" | "Pinned";

const SECTION_ICONS: Record<SectionKey, React.ComponentType<{ className?: string }>> = {
    Nodes: Network, Tags: Tag, Filters: SlidersHorizontal, Pinned: Pin,
};

const SECTIONS: SectionKey[] = ["Nodes", "Tags", "Filters", "Pinned"];

export function Sidebar() {
    const {
        nodes, selectedNode, setSelectedNode, setSearch,
        setHighlightedNodes, pinnedNodes, isSidebarCollapsed, setSidebarCollapsed,
    } = useSynapseStore();

    const [activeSection, setActiveSection] = useState<SectionKey>("Nodes");
    const [localQuery, setLocalQuery] = useState("");
    const [activeTag, setActiveTag] = useState<string | null>(null);

    const fuse = new Fuse(nodes, { keys: ["title", "tags", "aliases", "description"], threshold: 0.35 });

    const handleSearch = (value: string) => {
        setLocalQuery(value);
        setSearch(value);
        if (!value.trim()) { setHighlightedNodes([]); setActiveTag(null); return; }
        const results = fuse.search(value).map((r) => r.item.id);
        setHighlightedNodes(results);
    };

    const handleTagClick = (tag: string) => {
        if (activeTag === tag) { setActiveTag(null); handleSearch(""); }
        else { setActiveTag(tag); handleSearch(tag); }
    };

    const handleClearFilters = () => { setActiveTag(null); handleSearch(""); };

    const allTags = Array.from(new Set(nodes.flatMap((n) => n.tags ?? [])));
    const pinnedNodeData = nodes.filter((n) => pinnedNodes.includes(n.id));
    const filteredNodes = localQuery.trim() ? fuse.search(localQuery).map((r) => r.item) : nodes;

    if (isSidebarCollapsed) {
        return (
            <aside className="flex flex-col w-12 shrink-0 h-full bg-gray-50 dark:bg-[#111113] border-r border-gray-200 dark:border-white/[0.07] overflow-hidden items-center py-2 gap-1">
                <button onClick={() => setSidebarCollapsed(false)}
                    className="size-8 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                    title="Expand sidebar"><ChevronRight className="size-4" /></button>
                <Separator className="bg-gray-200 dark:bg-white/[0.07] w-8" />
                {SECTIONS.map((section) => {
                    const Icon = SECTION_ICONS[section];
                    return (
                        <button key={section}
                            onClick={() => { setSidebarCollapsed(false); setActiveSection(section); }}
                            title={section}
                            className={`size-8 flex items-center justify-center rounded-md transition-colors ${activeSection === section
                                ? "bg-accent-theme/20 text-accent-theme dark:text-accent-theme-light"
                                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
                                }`}>
                            <Icon className="size-4" />
                        </button>
                    );
                })}
            </aside>
        );
    }

    return (
        <aside className="flex flex-col w-[220px] shrink-0 h-full bg-gray-50 dark:bg-[#111113] border-r border-gray-200 dark:border-white/[0.07] overflow-hidden transition-all duration-200">
            <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-white/[0.07]">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
                    <Input placeholder="Search nodes..." value={localQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-8 h-7 text-xs bg-gray-100 dark:bg-white/[0.05] border-gray-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 rounded-md" />
                </div>
                <button onClick={() => setSidebarCollapsed(true)}
                    className="size-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors shrink-0"
                    title="Collapse sidebar"><ChevronLeft className="size-3.5" /></button>
            </div>

            <nav className="flex flex-col gap-0.5 p-2 border-b border-gray-200 dark:border-white/[0.07]">
                {SECTIONS.map((section) => {
                    const Icon = SECTION_ICONS[section];
                    return (
                        <button key={section} onClick={() => setActiveSection(section)}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors w-full text-left ${activeSection === section
                                ? "bg-accent-theme/20 text-accent-theme dark:text-accent-theme-light"
                                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
                                }`}>
                            <Icon className="size-3.5" />
                            {section}
                            {section === "Pinned" && pinnedNodeData.length > 0 && (
                                <Badge className="ml-auto h-4 min-w-4 px-1 text-[9px] bg-accent-theme/30 text-accent-theme-light border-accent-theme/40">
                                    {pinnedNodeData.length}
                                </Badge>
                            )}
                        </button>
                    );
                })}
            </nav>

            {localQuery.trim() && (
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-white/[0.07] bg-accent-theme/5 dark:bg-accent-theme-dark/10">
                    <span className="text-[10px] text-accent-theme dark:text-accent-theme-light">
                        Filtering: <strong>{localQuery}</strong>
                    </span>
                    <Button variant="ghost" size="icon" onClick={handleClearFilters}
                        className="size-5 text-accent-theme dark:text-accent-theme-light hover:text-accent-theme-dark dark:hover:text-accent-theme-light"
                        title="Clear filters"><X className="size-3" /></Button>
                </div>
            )}

            <ScrollArea className="flex-1 min-h-0">
                <div className="p-2 space-y-1">
                    {activeSection === "Nodes" && (
                        <>
                            {filteredNodes.map((node) => (
                                <NodeListItem key={node.id} node={node}
                                    isSelected={selectedNode?.id === node.id}
                                    onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)} />
                            ))}
                            {filteredNodes.length === 0 && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-600 px-2 py-4 text-center">No nodes found</p>
                            )}
                        </>
                    )}

                    {activeSection === "Tags" && (
                        <div className="flex flex-wrap gap-1.5 p-1">
                            {allTags.map((tag) => (
                                <button key={tag} onClick={() => handleTagClick(tag)}
                                    className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${activeTag === tag
                                        ? "bg-accent-theme text-white border-accent-theme"
                                        : "bg-accent-theme/20 text-accent-theme dark:text-accent-theme-light border-accent-theme/30 hover:bg-accent-theme/30"
                                        }`}>{tag}</button>
                            ))}
                        </div>
                    )}

                    {activeSection === "Filters" && (
                        <div className="space-y-3 p-1">
                            <FilterGroup label="Type"
                                options={Array.from(new Set(
                                    nodes.map((n) => n.metadata?.type?.split(".")[0]).filter(Boolean) as string[]
                                ))}
                                onSelect={handleSearch} />
                        </div>
                    )}

                    {activeSection === "Pinned" && (
                        <>
                            {pinnedNodeData.length === 0 && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-600 px-2 py-4 text-center">No pinned nodes</p>
                            )}
                            {pinnedNodeData.map((node) => (
                                <NodeListItem key={node.id} node={node}
                                    isSelected={selectedNode?.id === node.id}
                                    onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)} />
                            ))}
                        </>
                    )}
                </div>
            </ScrollArea>
        </aside>
    );
}

function NodeListItem({ node, isSelected, onClick }: { node: GraphNode; isSelected: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick}
            className={`flex flex-col gap-0.5 w-full px-2.5 py-2 rounded-md text-left transition-colors ${isSelected
                ? "bg-accent-theme/20 border border-accent-theme/40 text-accent-theme-dark dark:text-accent-theme-light"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/[0.04] border border-transparent"
                }`}>
            <span className="text-xs font-medium truncate">{node.title}</span>
            <div className="flex gap-1 flex-wrap">
                {node.tags?.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-[9px] px-1.5 py-0 rounded bg-accent-theme/20 text-accent-theme dark:text-accent-theme-light">{tag}</span>
                ))}
            </div>
        </button>
    );
}

function FilterGroup({ label, options, onSelect }: { label: string; options: string[]; onSelect: (v: string) => void }) {
    return (
        <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-600 mb-1">{label}</p>
            <div className="flex flex-wrap gap-1">
                {options.map((o) => (
                    <button key={o} onClick={() => onSelect(o)}
                        className="px-2 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400 hover:bg-accent-theme/20 hover:text-accent-theme dark:hover:text-accent-theme-light border border-gray-200 dark:border-white/[0.06] transition-colors">{o}</button>
                ))}
            </div>
        </div>
    );
}
